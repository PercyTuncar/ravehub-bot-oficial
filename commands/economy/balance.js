const User = require('../../models/User');
const Economy = require('../../models/Economy');

module.exports = {
    name: 'balance',
    description: 'Muestra tu balance de economía.',
    category: 'economy',
    async execute(message) {
        const userId = message.key.remoteJid;
        try {
            let user = await User.findOne({ userId });
            let economy = await Economy.findOne({ userId });

            if (!user) {
                user = new User({ userId, name: message.pushName || 'Nuevo Usuario' });
                await user.save();
            }
            if (!economy) {
                economy = new Economy({ userId });
                await economy.save();
            }

            const balanceMessage = `*Balance de ${user.name}*
Cartera: ${economy.wallet}\nBanco: ${economy.bank}`;
            this.sock.sendMessage(userId, { text: balanceMessage });
        } catch (error) {
            console.error('Error al obtener el balance:', error);
            this.sock.sendMessage(userId, { text: 'Ocurrió un error al obtener tu balance.' });
        }
    }
};
