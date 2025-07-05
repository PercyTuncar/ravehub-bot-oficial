const { getSocket } = require('../../bot');
const { getMentions } = require('../../utils/messageUtils');

module.exports = {
    name: 'compatibilidad',
    description: 'Calcula la compatibilidad entre dos usuarios.',
    aliases: ['compatibility'],
    async execute(message, args) {
        const sock = getSocket();
        const from = message.key.remoteJid;
        const mentions = getMentions(message);
        const requesterJid = message.key.participant || message.key.remoteJid;

        let userA_jid, userB_jid;

        if (mentions.length >= 2) {
            userA_jid = mentions[0];
            userB_jid = mentions[1];
        } else if (mentions.length === 1) {
            userA_jid = requesterJid;
            userB_jid = mentions[0];
        } else {
            return sock.sendMessage(from, { text: 'Debes mencionar a una o dos personas.' }, { quoted: message });
        }

        const compatibility = Math.floor(Math.random() * 101);
        let description = '';
        let song = '';

        if (compatibility >= 80) {
            description = '✨ Alta conexión emocional y mucha química.';
            song = '“We Found Love” – Rihanna';
        } else if (compatibility >= 60) {
            description = '😊 Buena compatibilidad, con potencial para algo grande.';
            song = '“Perfect” – Ed Sheeran';
        } else if (compatibility >= 40) {
            description = '🤔 Tienen sus diferencias, pero podrían funcionar.';
            song = '“Someone Like You” – Adele';
        } else {
            description = '😬 La compatibilidad es baja, pero el amor todo lo puede.';
            song = '“Bad Romance” – Lady Gaga';
        }

        const text = `🔮 Compatibilidad entre @${userA_jid.split('@')[0]} y @${userB_jid.split('@')[0]}: ${compatibility}%
${description}
🎶 Canción recomendada: ${song}`;

        sock.sendMessage(from, { text, mentions: [userA_jid, userB_jid] });
    }
};
