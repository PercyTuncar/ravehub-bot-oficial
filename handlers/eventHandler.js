const commandHandler = require('./commandHandler');
const { handleGameResponse } = require('./gameHandler');
const { getGameSession } = require('../utils/gameUtils');
const { handleLoanResponse, getLoanSession } = require('./loanSessionHandler'); // Updated import
const GroupSettings = require('../models/GroupSettings');
const { getSocket } = require('../bot');
const userCooldowns = new Map();

module.exports = async (m) => {
    const sock = getSocket();
    const commands = commandHandler();

    console.log('Evento messages.upsert recibido:', JSON.stringify(m, null, 2));
    const message = m.messages[0];
    if (!message.message) return;

    const jid = message.key.participant || message.key.remoteJid;

    // --- Loan Session Handler ---
    if (getLoanSession(jid)) {
        const loanHandled = await handleLoanResponse(message);
        if (loanHandled) {
            return; // Stop processing if the message was part of a loan session
        }
    }

    // --- Game Handler Integration ---
    if (getGameSession(jid)) {
        const gameHandled = await handleGameResponse(message);
        if (gameHandled) {
            return; // Detener el procesamiento si el mensaje fue manejado por el juego
        }
    }

    const messageContent = message.message.conversation || message.message.extendedTextMessage?.text || message.message.imageMessage?.caption || message.message.videoMessage?.caption || '';
    console.log('Contenido del mensaje extraído:', messageContent);

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
    if (!messageContent.startsWith(process.env.PREFIX)) {
        console.log('El mensaje no es un comando.');
        return;
    }

    console.log('Procesando como un comando...');
    const args = messageContent.slice(process.env.PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = commands.get(commandName);
    if (!command) {
        console.log(`Comando no encontrado: ${commandName}`);
        return;
    }

    console.log(`Ejecutando comando: ${commandName}`);
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
        await command.execute(message, args, commands);
    } catch (error) {
        console.error('Error al ejecutar el comando:', error);
        sock.sendMessage(message.key.remoteJid, { text: 'Ocurrió un error al ejecutar el comando.' });
    }
};
