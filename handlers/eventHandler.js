const commandHandler = require('./commandHandler');
const { handleGameMessage } = require('./gameHandler');
const { handleLoanResponse } = require('./loanHandler');
const { getGameSession } = require('../utils/gameUtils');
const GroupSettings = require('../models/GroupSettings');
const { sock } = require('../index');
const userCooldowns = new Map();

module.exports = (sock) => {
    const commands = commandHandler(sock);

    sock.ev.on('messages.upsert', async (m) => {
        console.log('Evento messages.upsert recibido:', JSON.stringify(m, null, 2));
        const message = m.messages[0];
        if (!message.message) return;

        const jid = message.key.participant || message.key.remoteJid;

        // --- Game Handler Integration ---
        if (getGameSession(jid)) {
            const gameHandled = await handleGameMessage(sock, message);
            if (gameHandled) {
                return; // Detener el procesamiento si el mensaje fue manejado por el juego
            }
        }

        // --- Loan Response Handler ---
        const messageContentRaw = message.message.conversation || message.message.extendedTextMessage?.text || '';
        const isLoanResponseWord = ['si', 'sí', 'sì', 'no'].includes(messageContentRaw.toLowerCase().trim());

        if (isLoanResponseWord) {
            const loanHandled = await handleLoanResponse(sock, message);
            if (loanHandled) {
                return; // Stop processing if it was a valid loan response
            }
        }

        // Check for invalid loan responses (user has a pending loan but didn't say si/no)
        const User = require('../models/User');
        const sender = await User.findOne({ 
            jid: jid, 
            'pendingLoan.borrowerJid': { $ne: null },
            'pendingLoan.expiresAt': { $gt: new Date() }
        });

        if (sender && !isLoanResponseWord && messageContentRaw.trim() !== '') {
            await sock.sendMessage(message.key.remoteJid, { 
                text: `Hey @${sender.name}, tienes una solicitud de préstamo pendiente. Responde con "si" o "no".`,
                mentions: [jid]
            });
            return; // Stop further processing
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
            command.execute(sock, message, args, commands);
        } catch (error) {
            console.error('Error al ejecutar el comando:', error);
            sock.sendMessage(message.key.remoteJid, { text: 'Ocurrió un error al ejecutar el comando.' });
        }
    });
};
