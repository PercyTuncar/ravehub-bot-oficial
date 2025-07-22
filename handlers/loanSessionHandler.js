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
        return false;
    }

    const messageContent = (message.message.conversation || message.message.extendedTextMessage?.text || '').toLowerCase().trim();
    if (!['si', 'sí', 'sì', 'no'].includes(messageContent)) {
        await sock.sendMessage(message.key.remoteJid, {
            text: `Hey @${senderJid.split('@')[0]}, tienes una solicitud de préstamo pendiente. Responde con "si" o "no".`,
            mentions: [senderJid]
        });
        return true;
    }

    const { borrowerJid, amount } = session;
    const chatId = message.key.remoteJid;
    const currency = await getCurrency(chatId);
    const lenderUser = await findOrCreateUser(senderJid, chatId, message.pushName);
    const borrowerUser = await findOrCreateUser(borrowerJid, chatId);

    if (messageContent.startsWith('s')) { // Accepted
        const totalFunds = lenderUser.economy.wallet + lenderUser.economy.bank;
        if (totalFunds < amount) {
            await sock.sendMessage(chatId, {
                text: `❗ @${lenderUser.name} tiene la voluntad de prestarte, ¡pero ahora está *misio*! 😅`,
                mentions: [borrowerJid, senderJid]
            });
        } else {
            let ops = [];
            if (lenderUser.economy.wallet >= amount) {
                ops.push({ updateOne: { filter: { _id: lenderUser._id }, update: { $inc: { 'economy.wallet': -amount } } } });
            } else {
                const fromBank = amount - lenderUser.economy.wallet;
                ops.push({ updateOne: { filter: { _id: lenderUser._id }, update: { $set: { 'economy.wallet': 0 }, $inc: { 'economy.bank': -fromBank } } } });
            }
            ops.push({ updateOne: { filter: { _id: borrowerUser._id }, update: { $inc: { 'economy.wallet': amount } } } });

            const result = await User.bulkWrite(ops);

            if (result.modifiedCount === 2) {
                const newDebt = new Debt({
                    groupId: chatId,
                    borrower: borrowerUser._id,
                    lender: lenderUser._id,
                    amount: amount,
                    interest: 0.10,
                    createdAt: new Date(),
                    lastInterestApplied: new Date()
                });
                await newDebt.save();
                await User.findByIdAndUpdate(borrowerUser._id, { $push: { debts: newDebt._id } });

                addMessageToQueue(sock, chatId, {
                    text: `✅ @${lenderUser.name} ha aceptado el préstamo. Se han transferido ${currency} ${amount.toLocaleString()} a @${borrowerUser.name}.`,
                    mentions: [senderJid, borrowerJid]
                });
            } else {
                 await sock.sendMessage(chatId, { text: '❌ Ocurrió un error atómico al transferir el dinero. La operación ha sido cancelada.' });
            }
        }
    } else { // Rejected
        await sock.sendMessage(chatId, {
            text: `❌ @${lenderUser.name} ha rechazado la solicitud de préstamo de @${borrowerUser.name}.`,
            mentions: [senderJid, borrowerJid]
        });
    }

    clearLoanSession(senderJid);
    return true;
}

module.exports = {
    createLoanSession,
    getLoanSession,
    clearLoanSession,
    handleLoanResponse
};
