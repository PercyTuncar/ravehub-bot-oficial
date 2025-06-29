const User = require('../../models/User');

module.exports = {
    name: 'deuda',
    description: 'Muestra tu deuda judicial actual.',
    aliases: ['debt'],
    usage: '.deuda',
    category: 'economy',
    async execute(sock, message) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        try {
            let user = await User.findOne({ jid: senderJid });

            if (!user || user.judicialDebt <= 0) {
                const reply = `🎉 ¡Felicidades! 🎉\n\n@${senderJid.split('@')[0]}, no tienes ninguna deuda judicial pendiente. ¡Sigue así!`;
                return sock.sendMessage(chatId, { text: reply, mentions: [senderJid] });
            }

            const debtMessage = `⚖️ *Estado de Deuda Judicial* ⚖️\n\nHola @${senderJid.split('@')[0]},\n\nTienes una deuda pendiente con la justicia.\n\n💰 *Monto de la deuda:* ${user.judicialDebt} 💵\n\nRecuerda que no podrás realizar ciertas acciones, como robar, hasta que saldes tu deuda. Puedes pagarla trabajando o al realizar compras.`;

            await sock.sendMessage(chatId, { text: debtMessage, mentions: [senderJid] });

        } catch (error) {
            console.error('Error al consultar la deuda:', error);
            sock.sendMessage(chatId, { text: '❌ Ocurrió un error al consultar tu deuda.' });
        }
    },
};
