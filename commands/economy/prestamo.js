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

        // Check for an existing loan request and if it has expired.
        if (lender.pendingLoan && lender.pendingLoan.borrowerJid) {
            if (new Date() < new Date(lender.pendingLoan.expiresAt)) {
                // If the loan has NOT expired, tell the user to wait.
                return sock.sendMessage(chatId, { text: `⚠️ @${lender.name} ya tiene una solicitud de préstamo pendiente. Por favor, espera a que la resuelva.`, mentions: [lenderJid] });
            } else {
                // If the loan HAS expired, clear it before proceeding.
                lender.pendingLoan = null;
                await lender.save();
            }
        }

        const loanRequestMessage = `Hola @${lenderJid.split('@')[0]}, @${senderJid.split('@')[0]} te ha solicitado un préstamo de ${amount} 💵.\n\nResponde con \"Si\" para aceptar o \"No\" para rechazar.\n*Tienes 30 segundos para responder.*`;
        
        const sentMessage = await sock.sendMessage(chatId, {
            text: loanRequestMessage,
            mentions: [lenderJid, senderJid]
        });

        lender.pendingLoan = {
            borrowerJid: senderJid,
            amount: amount,
            messageId: sentMessage.key.id,
            expiresAt: new Date(new Date().getTime() + 30000) // 30 seconds expiry
        };
        await lender.save();

        // Set a timeout to automatically cancel the loan request
        setTimeout(async () => {
            try {
                const freshLender = await User.findOne({ jid: lenderJid });
                if (freshLender && freshLender.pendingLoan && freshLender.pendingLoan.messageId === sentMessage.key.id) {
                    freshLender.pendingLoan = null; // Clear the pending loan
                    await freshLender.save();
                    await sock.sendMessage(chatId, {
                        text: `⏳ La solicitud de préstamo de @${senderJid.split('@')[0]} a @${lenderJid.split('@')[0]} ha expirado por falta de respuesta.`,
                        mentions: [senderJid, lenderJid]
                    });
                }
            } catch (error) {
                console.error('Error al anular el préstamo por tiempo de espera:', error);
            }
        }, 30000); // 30 seconds
    },
};
