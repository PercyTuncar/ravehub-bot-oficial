const User = require('../../models/User');
const { getSocket } = require('../../bot');
const { getMentions } = require('../../utils/messageUtils'); // Asumiendo que tienes una utilidad para obtener menciones

const ongoingMatches = new Map();

module.exports = {
    name: 'match',
    description: 'Inicia un match aleatorio en el grupo.',
    aliases: [],
    async execute(message, args) {
        const sock = getSocket();
        const from = message.key.remoteJid;

        if (ongoingMatches.has(from)) {
            return sock.sendMessage(from, { text: 'Ya hay un match en curso en este grupo.' }, { quoted: message });
        }

        try {
            const groupMetadata = await sock.groupMetadata(from);
            const participants = groupMetadata.participants.map(p => p.id);

            const users = await User.find({ jid: { $in: participants }, 'loveInfo.relationshipStatus': 'Soltero/a' });

            if (users.length < 2) {
                return sock.sendMessage(from, { text: 'No hay suficientes solteros en el grupo para un match.' }, { quoted: message });
            }

            const userA = users[Math.floor(Math.random() * users.length)];
            let userB = users[Math.floor(Math.random() * users.length)];

            while (userA.jid === userB.jid) {
                userB = users[Math.floor(Math.random() * users.length)];
            }

            const matchInfo = {
                userA: { jid: userA.jid, name: userA.name, accepted: false },
                userB: { jid: userB.jid, name: userB.name, accepted: false },
                timer: null
            };

            ongoingMatches.set(from, matchInfo);

            const text = `💘 ¡Es momento de un nuevo MATCH!
🎲 El algoritmo del amor ha elegido a:
👉 @${userA.jid.split('@')[0]} y @${userB.jid.split('@')[0]}

¿Aceptan hacer match? Solo respondan con: \`acepto\` o \`rechazo\` (sin punto).
⏳ Tienen 60 segundos para decidir.`;

            await sock.sendMessage(from, { text, mentions: [userA.jid, userB.jid] });

            matchInfo.timer = setTimeout(() => {
                if (ongoingMatches.has(from)) {
                    sock.sendMessage(from, { text: '🕐 El match expiró. Nadie respondió a tiempo.' });
                    ongoingMatches.delete(from);
                }
            }, 60000);

        } catch (error) {
            console.error('Error en el comando match:', error);
            sock.sendMessage(from, { text: 'Ocurrió un error al intentar iniciar el match.' }, { quoted: message });
        }
    },
    ongoingMatches
};
