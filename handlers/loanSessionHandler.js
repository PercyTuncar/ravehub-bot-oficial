const User = require('../models/User');
const Debt = require('../models/Debt');
const { findOrCreateUser } = require('../utils/userUtils');
const { getCurrency } = require('../utils/groupUtils');
const { getSocket } = require('../bot');
const { addMessageToQueue } = require('../utils/messageQueue');

const loanSessions = new Map();

function createLoanSession(chatId, lenderJid, borrowerJid, amount, messageId) {
    const sock = getSocket();
    const expiresAt = new Date(new Date().getTime() + 30000); // 30 seconds expiry
    const sessionTimer = setTimeout(async () => {
        const session = loanSessions.get(lenderJid);
        // Check if the session still exists and hasn't been handled
        if (session && session.messageId === messageId) {
            loanSessions.delete(lenderJid);
            await sock.sendMessage(chatId, {
                text: `⏳ La solicitud de préstamo de @${borrowerJid.split('@')[0]} a @${lenderJid.split('@')[0]} ha expirado por falta de respuesta.`,
                mentions: [borrowerJid, lenderJid]
            });
        }
    }, 30000);

    loanSessions.set(lenderJid, {
        borrowerJid,
        amount,
        messageId,
        expiresAt,
        timer: sessionTimer
    });
}

function getLoanSession(jid) {
    return loanSessions.get(jid);
}

function clearLoanSession(jid) {
    const session = loanSessions.get(jid);
    if (session) {
        clearTimeout(session.timer);
        loanSessions.delete(jid);
    }
}

async function handleLoanResponse(message) {
    const sock = getSocket();
    const senderJid = message.key.participant || message.key.remoteJid;
    const session = getLoanSession(senderJid);

    if (!session || new Date() > session.expiresAt) {
        if (session) clearLoanSession(senderJid);
        return false; // No active session or expired
    }

    const messageContent = (message.message.conversation || message.message.extendedTextMessage?.text || '').toLowerCase().trim();
    if (!['si', 'sí', 'sì', 'no'].includes(messageContent)) {
        // It's a message from a user in a loan session, but not a valid response.
        await sock.sendMessage(message.key.remoteJid, {
            text: `Hey @${senderJid.split('@')[0]}, tienes una solicitud de préstamo pendiente. Responde con "si" o "no".`,
            mentions: [senderJid]
        });
        return true; // Message handled by sending a reminder.
    }

    const { borrowerJid, amount } = session;
    const chatId = message.key.remoteJid;
    const currency = await getCurrency(chatId);
    // Corregido: pasar siempre chatId como groupId
    const lender = await findOrCreateUser(senderJid, chatId, message.pushName);
    const borrower = await findOrCreateUser(borrowerJid, chatId);

    if (messageContent.startsWith('s')) { // Accepted
        const totalFunds = lender.economy.wallet + lender.economy.bank;
        if (totalFunds < amount) {
            await sock.sendMessage(chatId, {
                text: `❗ @${lender.jid.split('@')[0]} tiene la voluntad de prestarte, ¡pero ahora está *misio*! 😅`,
                mentions: [borrowerJId, lender.jid]
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

            // Crear deuda con groupId y marcar en Infocorp (reputación deudora)
            const newDebt = new Debt({
                groupId: chatId,
                borrower: borrower._id,
                lender: lender._id,
                amount: amount,
                interest: 0.10, // 10% diario
                createdAt: new Date(),
                lastInterestApplied: new Date()
            });
            await newDebt.save();

            // Vincular deuda al usuario
            borrower.debts.push(newDebt._id);
            
            await lender.save();
            await borrower.save();

            addMessageToQueue(sock, chatId, {
                text: `Has prestado ${amount} monedas a @${to.split('@')[0]}.`,
                mentions: [to]
            });
        }
    } else { // Rejected
        await sock.sendMessage(chatId, {
            text: `❌ @${lender.jid.split('@')[0]} ha rechazado la solicitud de préstamo de @${borrower.jid.split('@')[0]}.`,
            mentions: [lender.jid, borrower.jid]
        });
    }

    clearLoanSession(senderJid); // Clear the session after handling the response.
    return true; // Indicate that the message was handled.
}

module.exports = {
    createLoanSession,
    getLoanSession,
    clearLoanSession,
    handleLoanResponse
};
