const User = require('../../models/User');
const { getSocket } = require('../../bot');
const { findOrCreateUser } = require('../../utils/userUtils');

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
            const participants = groupMetadata.participants.map(p => ({ jid: p.id, name: p.subject || p.id.split('@')[0] }));

            const usersInRelationship = await User.find({ 'loveInfo.relationshipStatus': 'En una relación' }, 'jid');
            const jidsInRelationship = usersInRelationship.map(u => u.jid);

            const singleParticipants = participants.filter(p => !jidsInRelationship.includes(p.jid));

            if (singleParticipants.length < 2) {
                return sock.sendMessage(from, { text: 'No hay suficientes solteros en el grupo para un match.' }, { quoted: message });
            }

            const userA_info = singleParticipants[Math.floor(Math.random() * singleParticipants.length)];
            let userB_info = singleParticipants[Math.floor(Math.random() * singleParticipants.length)];

            while (userA_info.jid === userB_info.jid) {
                userB_info = singleParticipants[Math.floor(Math.random() * singleParticipants.length)];
            }

            // Asegurarse que los usuarios existan en la DB
            const userA = await findOrCreateUser(userA_info.jid, from, userA_info.name);
            const userB = await findOrCreateUser(userB_info.jid, from, userB_info.name);

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
