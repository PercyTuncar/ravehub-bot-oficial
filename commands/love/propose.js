const User = require('../../models/User');
const { getMentions } = require('../../utils/messageUtils');
const { findOrCreateUser } = require('../../utils/userUtils');

const ongoingProposals = new Map();

module.exports = {
    name: 'proponer',
    description: 'Propone una relación a otro usuario.',
    category: 'love',
    aliases: ['propose', 'pedir'],
    async execute(message, args, client) {
        const from = message.key.remoteJid;
        const proposerJid = message.key.participant || message.key.remoteJid;

        const mentions = await getMentions(message);
        if (mentions.length === 0) {
            return client.sendMessage(from, { text: 'Debes mencionar a alguien para proponerle una relación.' }, { quoted: message });
        }

        const proposedJid = mentions[0];

        if (proposerJid === proposedJid) {
            return client.sendMessage(from, { text: 'No puedes proponerte una relación a ti mismo.' }, { quoted: message });
        }
        
        try {
            const groupMetadata = await client.groupMetadata(from);
            const proposerInfo = groupMetadata.participants.find(p => p.id === proposerJid);
            const proposedInfo = groupMetadata.participants.find(p => p.id === proposedJid);

            const proposer = await findOrCreateUser(proposerJid, from, proposerInfo.name || proposerJid.split('@')[0]);
            const proposed = await findOrCreateUser(proposedJid, from, proposedInfo.name || proposedJid.split('@')[0]);

            if (proposer.loveInfo.relationshipStatus !== 'Soltero/a' || proposed.loveInfo.relationshipStatus !== 'Soltero/a') {
                return client.sendMessage(from, { text: 'Ambos deben estar solteros para iniciar una relación.' }, { quoted: message });
            }

            const proposalKey = `${proposerJid}-${proposedJid}`;
            if (ongoingProposals.has(proposalKey)) {
                return client.sendMessage(from, { text: 'Ya hay una propuesta en curso entre ustedes.' }, { quoted: message });
            }

            const proposalInfo = {
                proposer: { jid: proposerJid, name: proposer.name },
                proposed: { jid: proposedJid, name: proposed.name },
                timer: null
            };

            ongoingProposals.set(proposalKey, proposalInfo);

            const text = `💌 @${proposedJid.split('@')[0]}, ¿aceptas ser la pareja de @${proposerJid.split('@')[0]}?
Responde con \`acepto\` o \`rechazo\` (sin punto). Tienes 2 minutos ⏳.`;

            await client.sendMessage(from, { text, mentions: [proposerJid, proposedJid] });

            proposalInfo.timer = setTimeout(() => {
                if (ongoingProposals.has(proposalKey)) {
                    client.sendMessage(from, { text: '⏳ La propuesta de pareja expiró por falta de respuesta.' });
                    ongoingProposals.delete(proposalKey);
                }
            }, 120000);

        } catch (error) {
            console.error('Error en el comando proponer:', error);
            client.sendMessage(from, { text: 'Ocurrió un error al enviar la propuesta.' }, { quoted: message });
        }
    },
    ongoingProposals
};
