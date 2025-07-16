const { handleGameResponse } = require('./gameHandler');
const { getGameSession } = require('../utils/gameUtils');
const { handleLoanResponse, getLoanSession } = require('./loanSessionHandler');
const { handleLoveResponses } = require('./loveHandler');
const { getGroupSettings } = require('../utils/groupUtils');
const { findOrCreateUser } = require('../utils/userUtils');
const { getSocket } = require('../bot');
const logger = require('../config/logger'); // Importar el logger
const userCooldowns = new Map();
const GroupSettings = require('../models/GroupSettings');
const { addMessageToQueue } = require('../utils/messageQueue');

// Función unificada para manejar todos los mensajes entrantes
async function handleMessage(message, commands) {
    const sock = getSocket();
    const chatId = message.key.remoteJid;
    const userJid = message.key.participant || message.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');

    // Forma directa de obtener el texto del mensaje sin messageUtils
    const messageText = message.message?.conversation || 
                        message.message?.extendedTextMessage?.text || 
                        message.message?.imageMessage?.caption || 
                        message.message?.videoMessage?.caption || 
                        '';

    // Log para depuración directa en la consola
    console.log(`\n--- NUEVO MENSAJE ---`);
    console.log(`De: ${userJid}`);
    console.log(`En: ${chatId}`);
    console.log(`Texto: ${messageText}`);
    console.log(`Objeto completo:`, JSON.stringify(message, null, 2));
    console.log(`---------------------\n`);

    // Log detallado de cada mensaje recibido (SECCIÓN COMENTADA PARA EVITAR DUPLICADOS)
    /*
    logger.info({
        chatId,
        userJid,
        isGroup,
        messageText: messageText ? (messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText) : 'No text'
    }, 'Mensaje recibido');
    */

    // --- Lógica Anti-Link (Versión corregida y única) ---
    const groupSettings = await getGroupSettings(chatId);
    if (groupSettings && groupSettings.antiLinkEnabled && isGroup) {
        const linkRegex = /(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})(\/[^\s]*)?/gi;

        if (linkRegex.test(messageText)) {
            const groupMetadata = await sock.groupMetadata(chatId);
            const sender = groupMetadata.participants.find(p => p.id === userJid);

            // No aplicar anti-link a los administradores
            if (sender && sender.admin !== 'admin' && sender.admin !== 'superadmin') {
                const user = await findOrCreateUser(userJid, chatId);
                
                addMessageToQueue(sock, chatId, { delete: message.key });

                user.warnings = (user.warnings || 0) + 1;
                await user.save();

                const warnings = user.warnings;
                const warnLimit = process.env.WARN_LIMIT || 3;

                if (warnings >= warnLimit) {
                    const kickText = `🚫 @${userJid.split('@')[0]} ha sido eliminado por alcanzar el límite de ${warnLimit} advertencias por envío de enlaces.`
                    addMessageToQueue(sock, chatId, { text: kickText, mentions: [userJid] });
                    await sock.groupParticipantsUpdate(chatId, [userJid], 'remove');
                } else {
                    const warnText = `🚨 *¡ADVERTENCIA!* 🚨\n\n*Usuario:* @${userJid.split('@')[0]}\n*Motivo:* Envío de enlaces no permitido.\n\n*Advertencias:* ${warnings}/${warnLimit}\n\n_Por favor, respeta las reglas del grupo._`;
                    addMessageToQueue(sock, chatId, { text: warnText, mentions: [userJid] });
                }
                return; // Detener el procesamiento aquí, ya que fue manejado como un enlace
            }
        }
    }

    // --- Loan Session Handler ---
    if (getLoanSession(userJid)) {
        if (await handleLoanResponse(message)) return;
    }

    // --- Game Handler Integration ---
    if (await getGameSession(userJid)) {
        if (await handleGameResponse(message)) return;
    }

    if (await handleLoveResponses(message)) {
        return;
    }

    // --- Lógica de Comandos ---
    if (!messageText || !messageText.startsWith(process.env.PREFIX)) {
        return; // No es un comando, no hacer nada más.
    }

    const args = messageText.slice(process.env.PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = commands.get(commandName) || Array.from(commands.values()).find(cmd => cmd.alias && cmd.alias.includes(commandName));

    if (!command) return;

    // Cooldown
    if (userCooldowns.has(userJid)) {
        const lastCommandTime = userCooldowns.get(userJid);
        if (Date.now() - lastCommandTime < 3000) { // 3 segundos
            addMessageToQueue(sock, chatId, { text: 'Por favor, espera antes de usar otro comando.' });
            return;
        }
    }
    userCooldowns.set(userJid, Date.now());

    logger.info({ command: commandName, user: userJid }, `Ejecutando comando`);

    try {
        await command.execute(message, args);
        logger.info({ command: commandName, user: userJid }, `Comando ejecutado exitosamente`);
    } catch (error) {
        logger.error({ err: error, command: commandName, user: userJid }, `Falló la ejecución del comando`);
        addMessageToQueue(sock, chatId, { text: '⚙️ Ocurrió un error al intentar ejecutar ese comando.' });
    }
}

async function handleWelcomeMessage(sock, groupMetadata, newParticipantId) {
    try {
        const groupSettings = await GroupSettings.findOne({ groupId: groupMetadata.id });
        if (groupSettings && groupSettings.welcomeMessage) {
            const memberCount = groupMetadata.participants.length;
            const urlRegex = /(https?:\/\/[^\s]+)/;
            const cleanMessage = groupSettings.welcomeMessage.replace(urlRegex, '').trim();

            let welcomeText = cleanMessage
                .replace(/@user/g, `@${newParticipantId.split('@')[0]}`)
                .replace(/@group/g, groupMetadata.subject)
                .replace(/@count/g, memberCount);

            const messageData = {
                text: welcomeText,
                mentions: [newParticipantId]
            };

            if (groupSettings.welcomeImage) {
                messageData.image = { url: groupSettings.welcomeImage };
                messageData.caption = welcomeText;
                delete messageData.text;
            }

            addMessageToQueue(sock, groupMetadata.id, messageData);
        }
    } catch (error) {
        console.error('Error al enviar el mensaje de bienvenida:', error);
    }
}

// Se elimina la exportación anterior y se reemplaza por un objeto
module.exports = {
    handleMessage, // La función principal que procesa comandos
    handleWelcomeMessage // La función de bienvenida que ahora se exporta
};
