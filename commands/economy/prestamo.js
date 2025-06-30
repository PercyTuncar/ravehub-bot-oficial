const { findOrCreateUser } = require('../../utils/userUtils');
const User = require('../../models/User');

module.exports = {
    name: 'prestamo',
    description: 'Solicitar un préstamo a otro usuario.',
    aliases: ['loan'],
    usage: '.prestamo <monto> @usuario',
    category: 'economy',
    async execute(sock, message, args) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        if (args.length < 2 || !message.message.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
            return sock.sendMessage(chatId, { text: 'Debes especificar un monto y mencionar a un usuario. Ejemplo: .prestamo 500 @usuario' });
        }

        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount <= 0) {
            return sock.sendMessage(chatId, { text: 'El monto debe ser un número positivo.' });
        }

        const lenderJid = message.message.extendedTextMessage.contextInfo.mentionedJid[0];

        if (senderJid === lenderJid) {
            return sock.sendMessage(chatId, { text: 'No puedes pedirte un préstamo a ti mismo.' });
        }

        const borrower = await findOrCreateUser(senderJid);
        const lender = await findOrCreateUser(lenderJid);

        if (!lender) {
            return sock.sendMessage(chatId, { text: 'El usuario al que intentas pedirle un préstamo no está registrado.' });
        }

        const loanRequestMessage = `Hola @${lenderJid.split('@')[0]}, @${senderJid.split('@')[0]} te ha solicitado un préstamo de ${amount} 💵.\n\nResponde con \"Si\" para aceptar o \"No\" para rechazar.`;
        
        const sentMessage = await sock.sendMessage(chatId, {
            text: loanRequestMessage,
            mentions: [lenderJid, senderJid]
        });

        lender.pendingLoan = {
            borrowerJid: senderJid,
            amount: amount,
            messageId: sentMessage.key.id,
        };
        await lender.save();
    },
};
