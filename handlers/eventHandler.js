const commandHandler = require('./commandHandler');
const GroupSettings = require('../models/GroupSettings');
const { sock } = require('../index');
const userCooldowns = new Map();

module.exports = (sock) => {
    const commands = commandHandler(sock);

    sock.ev.on('messages.upsert', async (m) => {
        const message = m.messages[0];
        if (!message.message) return;

        const messageType = Object.keys(message.message)[0];
        const messageContent = message.message[messageType].caption || message.message[messageType].text || '';

        // Anti-links
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        if (urlRegex.test(messageContent)) {
            const chatId = message.key.remoteJid;
            if (chatId.endsWith('@g.us')) {
                const groupSettings = await GroupSettings.findOne({ groupId: chatId });
                if (groupSettings && groupSettings.antiLinkEnabled) {
                    const groupMetadata = await sock.groupMetadata(chatId);
                    const sender = groupMetadata.participants.find(p => p.id === message.key.participant);
                    if (sender.admin !== 'admin' && sender.admin !== 'superadmin') {
                        await sock.sendMessage(chatId, { delete: message.key });
                        let warnings = groupSettings.warnings.get(message.key.participant) || 0;
                        warnings++;
                        groupSettings.warnings.set(message.key.participant, warnings);
                        await groupSettings.save();

                        sock.sendMessage(chatId, { text: `@${message.key.participant.split('@')[0]} ha recibido una advertencia por enviar un enlace. Advertencias: ${warnings}/${process.env.WARN_LIMIT}` });

                        if (warnings >= process.env.WARN_LIMIT) {
                            await sock.groupParticipantsUpdate(chatId, [message.key.participant], 'remove');
                        }
                    }
                }
            }
        }

        // Command handler
        if (!messageContent.startsWith(process.env.PREFIX)) return;

        const args = messageContent.slice(process.env.PREFIX.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = commands.get(commandName);
        if (!command) return;

        const userId = message.key.participant || message.key.remoteJid;
        if (userCooldowns.has(userId)) {
            const lastCommandTime = userCooldowns.get(userId);
            const now = Date.now();
            if (now - lastCommandTime < 3000) { // 3 second cooldown
                return sock.sendMessage(message.key.remoteJid, { text: 'Por favor, espera antes de usar otro comando.' });
            }
        }

        userCooldowns.set(userId, Date.now());

        try {
            command.execute(message, args, commands);
        } catch (error) {
            console.error('Error al ejecutar el comando:', error);
            sock.sendMessage(message.key.remoteJid, { text: 'Ocurrió un error al ejecutar el comando.' });
        }
    });
};
