const { findOrCreateUser } = require('../../utils/userUtils');
const { createLoanSession, getLoanSession } = require('../../handlers/loanSessionHandler');
const { getCurrency } = require('../../utils/groupUtils');

module.exports = {
    name: 'prestame',
    description: 'Solicita un préstamo 💵.',
    aliases: ['loan', 'prestamo'],
    usage: '.prestame <monto> @usuario',
    category: 'economy',
    async execute(sock, message, args) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        if (args.length < 2 || !message.message.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
            return sock.sendMessage(chatId, { text: 'Debes especificar un monto y mencionar a un usuario. Ejemplo: .prestame 500 @usuario' });
        }

        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount <= 0) {
            return sock.sendMessage(chatId, { text: 'El monto debe ser un número positivo.' });
        }

        const lenderJid = message.message.extendedTextMessage.contextInfo.mentionedJid[0];

        if (senderJid === lenderJid) {
            return sock.sendMessage(chatId, { text: 'No puedes pedirte un préstamo a ti mismo.' });
        }

        // Check if the lender already has a pending loan session
        if (getLoanSession(lenderJid)) {
            return sock.sendMessage(chatId, { text: `⚠️ El usuario mencionado ya tiene una solicitud de préstamo pendiente. Por favor, espera a que la resuelva.` });
        }

        const borrower = await findOrCreateUser(senderJid);
        const lender = await findOrCreateUser(lenderJid);

        if (!lender) {
            return sock.sendMessage(chatId, { text: 'El usuario al que intentas pedirle un préstamo no está registrado.' });
        }
        const currency = await getCurrency(chatId);

        const loanRequestMessage = `Hola @${lenderJid.split('@')[0]}, @${senderJid.split('@')[0]} te ha solicitado un préstamo de ${amount} ${currency}.\n\nResponde con \"Si\" para aceptar o \"No\" para rechazar.\n*Tienes 30 segundos para responder.*`;
        
        const sentMessage = await sock.sendMessage(chatId, {
            text: loanRequestMessage,
            mentions: [lenderJid, senderJid]
        });

        // Create a new loan session
        createLoanSession(sock, chatId, lenderJid, senderJid, amount, sentMessage.key.id);
    },
};
