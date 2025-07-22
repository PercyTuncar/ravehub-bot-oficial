const { findOrCreateUser, updateHealth } = require('../../utils/userUtils');
const moment = require('moment');

const RELAX_COOLDOWN_MINUTES = 30;
const STRESS_REDUCTION = 5;

module.exports = {
    name: 'relajarse',
    description: `Tómate un respiro para reducir tu estrés. No requiere items. Tiene un cooldown de ${RELAX_COOLDOWN_MINUTES} minutos.`,
    aliases: ['relax', 'descansar'],
    category: 'rp',
    async execute(message, args, client) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;
        const pushName = message.pushName || '';

        try {
            const user = await findOrCreateUser(senderJid, chatId, pushName);

            if (user.status.isDead) {
                return client.sendMessage(chatId, { text: '👻 No puedes hacer nada, estás muerto.' });
            }

            if (user.status.stress === 0) {
                return client.sendMessage(chatId, { text: '😌 Ya estás completamente relajado/a.' });
            }

            // Verificar cooldown
            const now = moment();
            if (user.cooldowns.relax && now.isBefore(moment(user.cooldowns.relax))) {
                const timeLeft = moment.duration(moment(user.cooldowns.relax).diff(now)).humanize();
                return client.sendMessage(chatId, { text: `Necesitas descansar un poco más. Podrás volver a relajarte en ${timeLeft}.` });
            }

            // Aplicar efectos
            const oldStatus = { ...user.status };
            user.status.stress = Math.max(0, user.status.stress - STRESS_REDUCTION);
            
            // Actualizar salud general
            updateHealth(user);

            // Establecer nuevo cooldown
            user.cooldowns.relax = now.add(RELAX_COOLDOWN_MINUTES, 'minutes').toDate();
            
            await user.save();

            // Construir mensaje de respuesta
            let effectsMessage = `\n😌 Tu estrés ha disminuido en ${STRESS_REDUCTION} puntos.`;
            if (user.status.health > oldStatus.health) {
                effectsMessage += `\n❤️ Tu salud ha mejorado gracias al descanso.`;
            }

            const responseMessage = `*Un momento de paz...* 🧘\n\n@${senderJid.split('@')[0]} se toma un momento para respirar y poner la mente en blanco.${effectsMessage}`;

            return client.sendMessage(chatId, {
                text: responseMessage,
                mentions: [senderJid]
            });

        } catch (error) {
            console.error('Error en el comando relajarse:', error);
            return client.sendMessage(chatId, { text: '❌ Ocurrió un error al procesar tu acción.' });
        }
    },
};
