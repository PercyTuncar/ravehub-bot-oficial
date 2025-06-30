const User = require('../models/User');
const Debt = require('../models/Debt');
const { findOrCreateUser } = require('../utils/userUtils');

async function handleLoanResponse(sock, message) {
    const messageContent = (message.message.conversation || message.message.extendedTextMessage?.text || '').toLowerCase().trim();
    const senderJid = message.key.participant || message.key.remoteJid;
    const chatId = message.key.remoteJid;

    if (!['si', 'sí', 'sì', 'no'].includes(messageContent)) {
        return false; // Not a loan response
    }

    const lender = await User.findOne({ jid: senderJid, 'pendingLoan.borrowerJid': { $ne: null } });

    if (!lender || !message.message.extendedTextMessage?.contextInfo?.stanzaId || message.message.extendedTextMessage.contextInfo.stanzaId !== lender.pendingLoan.messageId) {
        return false; // Not a valid loan response
    }

    const borrowerJid = lender.pendingLoan.borrowerJid;
    const amount = lender.pendingLoan.amount;
    
    // Clear pending loan immediately to prevent double processing
    lender.pendingLoan = { borrowerJid: null, amount: 0, messageId: null };
    await lender.save();

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
   
    return true; // Message was handled
}

module.exports = { handleLoanResponse };
