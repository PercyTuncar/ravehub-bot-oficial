const User = require('../../models/User');
const Economy = require('../../models/Economy');

module.exports = {
    name: 'me',
    description: 'Muestra tu perfil.',
    category: 'utility',
    async execute(message) {
        const userId = message.key.participant || message.key.remoteJid;
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

            const profileMessage = `
*Perfil de ${user.name}*
Registrado: ${user.registeredAt.toLocaleDateString()}
Cartera: ${economy.wallet}
Banco: ${economy.bank}/${economy.bankCapacity}
            `;
            this.sock.sendMessage(message.key.remoteJid, { text: profileMessage });
        } catch (error) {
            console.error('Error al obtener el perfil:', error);
            this.sock.sendMessage(message.key.remoteJid, { text: 'Ocurrió un error al obtener tu perfil.' });
        }
    }
};
