const User = require('../models/User');
const Debt = require('../models/Debt');
const { findOrCreateUser } = require('../utils/userUtils');

async function handleLoanResponse(sock, message) {
    const messageContent = (message.message.conversation || message.message.extendedTextMessage?.text || '').toLowerCase().trim();
    const senderJid = message.key.participant || message.key.remoteJid;
    const chatId = message.key.remoteJid;

    if (!['si', 'sí', 'sì', 'no'].includes(messageContent)) {
        return false; // Not a loan response word
    }

    // Find a lender with a pending loan that hasn't expired
    const lender = await User.findOne({ 
        jid: senderJid, 
        'pendingLoan.borrowerJid': { $ne: null },
        'pendingLoan.expiresAt': { $gt: new Date() }
    });

    // If the sender is not a lender with an active pending loan, ignore.
    if (!lender || !lender.pendingLoan) {
        return false;
    }

    // A response is valid if it's a direct reply OR a standalone message from the lender.
    const isDirectReply = message.message.extendedTextMessage?.contextInfo?.stanzaId === lender.pendingLoan.messageId;
    const isStandaloneMessage = true; // If we found a lender with an active loan, we can treat it as valid.

    if (!isDirectReply && !isStandaloneMessage) {
        return false; // This condition is technically not needed anymore but kept for clarity
    }

    const { borrowerJid, amount, messageId } = lender.pendingLoan;
    
    // Double-check if the loan is still active before processing
    if (!borrowerJid || new Date() > new Date(lender.pendingLoan.expiresAt)) {
        lender.pendingLoan = null; // Clean up expired/invalid loan
        await lender.save();
        return false; // Expired or invalid
    }

    const borrower = await findOrCreateUser(borrowerJid);

    if (messageContent.startsWith('s')) { // Accepted
        const totalFunds = lender.economy.wallet + lender.economy.bank;
        if (totalFunds < amount) {
            await sock.sendMessage(chatId, {
                text: `❗ @${lender.name} tiene la voluntad de prestarte, ¡pero ahora está *misio*! 😅`,
                mentions: [borrowerJid, lender.jid]
            });
        } else {
            // Deduct from lender
            if (lender.economy.wallet >= amount) {
                lender.economy.wallet -= amount;
            } else {
                const remaining = amount - lender.economy.wallet;
                lender.economy.wallet = 0;
                lender.economy.bank -= remaining;
            }

            // Give to borrower
            borrower.economy.wallet += amount;

            // Create debt
            const newDebt = new Debt({
                borrower: borrower._id,
                lender: lender._id,
                amount: amount,
            });
            await newDebt.save();

            borrower.debts.push(newDebt._id);
            
            await lender.save();
            await borrower.save();

            await sock.sendMessage(chatId, {
                text: `✅ ¡Préstamo aceptado! @${lender.name} ha prestado ${amount} 💵 a @${borrower.name}.`,
                mentions: [lender.jid, borrower.jid]
            });
        }
    } else { // Rejected
        await sock.sendMessage(chatId, {
            text: `❌ @${lender.name} ha rechazado la solicitud de préstamo de @${borrower.name}.`,
            mentions: [lender.jid, borrower.jid]
        });
    }
   
    // Clear pending loan only after all operations are successful or rejection is sent
    lender.pendingLoan = null;
    await lender.save();

    return true; // Message was handled
}

module.exports = { handleLoanResponse };
