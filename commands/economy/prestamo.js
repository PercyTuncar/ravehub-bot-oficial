const { findOrCreateUser } = require('../../utils/userUtils');
const { createLoanSession, getLoanSession } = require('../../handlers/loanSessionHandler');
const { getCurrency } = require('../../utils/groupUtils');
const Debt = require('../../models/Debt'); // Asegúrate de que la ruta sea correcta
const { getSocket } = require('../../bot');

module.exports = {
    name: 'prestame',
    description: 'Solicita un préstamo 💵.',
    aliases: ['loan', 'prestamo'],
    usage: '.prestame <monto> @usuario',
    category: 'economy',
    async execute(message, args, commands) {
        const sock = bot.getSocket();
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        if (args.length < 2 || !message.message.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
            return sock.sendMessage(chatId, { text: 'Debes especificar un monto y mencionar a un usuario. Ejemplo: .prestame 500 @usuario' });
        }

        const lenderJid = message.message.extendedTextMessage.contextInfo.mentionedJid[0];

        // Busca el monto en los argumentos, sin importar la posición
        const amountArg = args.find(arg => !isNaN(parseInt(arg)));
        const amount = amountArg ? parseInt(amountArg) : NaN;

        if (isNaN(amount) || amount <= 0) {
            return sock.sendMessage(chatId, { text: 'El monto debe ser un número positivo. Ejemplo: .prestame @usuario 50' });
        }

        if (senderJid === lenderJid) {
            return sock.sendMessage(chatId, { text: 'No puedes pedirte un préstamo a ti mismo.' });
        }

        // Check if the lender already has a pending loan session
        if (getLoanSession(lenderJid)) {
            return sock.sendMessage(chatId, { text: `⚠️ El usuario mencionado ya tiene una solicitud de préstamo pendiente. Por favor, espera a que la resuelva.` });
        }

        const borrower = await findOrCreateUser(senderJid, chatId);
        const lender = await findOrCreateUser(lenderJid, chatId);

        if (!lender) {
            return sock.sendMessage(chatId, { text: 'El usuario al que intentas pedirle un préstamo no está registrado.' });
        }
        const currency = await getCurrency(chatId);

        // Verificar si ya existe una deuda entre el prestatario y el prestamista en este grupo
        const debt = await Debt.findOne({ borrower: borrower._id, lender: lender._id, groupId: chatId });
        if (debt) {
            return sock.sendMessage(chatId, { text: 'Ya tienes una deuda pendiente con este usuario en este grupo.' });
        }

        const loanRequestMessage = `💸 @${lenderJid.split('@')[0]}, @${senderJid.split('@')[0]} te ha solicitado un préstamo de *${currency} ${amount.toLocaleString()}*.` +
            `\n\nResponde con *Si* para aceptar o *No* para rechazar.\n⏳ *Tienes 30 segundos para responder.*`;
        
        const sentMessage = await sock.sendMessage(chatId, {
            text: loanRequestMessage,
            mentions: [lenderJid, senderJid]
        });

        // Create a new loan session
        createLoanSession(chatId, lenderJid, senderJid, amount, sentMessage.key.id);
    },
};
