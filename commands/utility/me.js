
const User = require('../../models/User');
const Economy = require('../../models/Economy');

module.exports = {
    name: 'me',
    description: 'Muestra tu perfil.',
    category: 'utility',
    async execute(message) {
        const userId = message.key.remoteJid;
        try {
            const [user, economy] = await Promise.all([
                User.findOne({ userId }),
                Economy.findOne({ userId })
            ]);

            if (!user) {
                const newUser = new User({ userId, name: message.pushName || 'Nuevo Usuario' });
                await newUser.save();
            }
            if (!economy) {
                const newEconomy = new Economy({ userId });
                await newEconomy.save();
            }

            const profileMessage = `
*Perfil de ${user.name}*
Registrado: ${user.registeredAt.toLocaleDateString()}
Cartera: ${economy.wallet}
Banco: ${economy.bank}/${economy.bankCapacity}
            `;
            sock.sendMessage(userId, { text: profileMessage });
        } catch (error) {
            console.error('Error al obtener el perfil:', error);
            sock.sendMessage(userId, { text: 'Ocurrió un error al obtener tu perfil.' });
        }
    }
};
