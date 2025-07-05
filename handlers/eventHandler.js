const { handleGameResponse } = require('./gameHandler');
const { getGameSession } = require('../utils/gameUtils');
const { handleLoanResponse, getLoanSession } = require('./loanSessionHandler');
const { getGroupSettings } = require('../utils/groupUtils');
const { findOrCreateUser } = require('../utils/userUtils');
const { getSocket } = require('../bot');
const userCooldowns = new Map();

// Función unificada para manejar todos los mensajes entrantes
async function handleMessage(message, commands) {
    const sock = getSocket();
    const chatId = message.key.remoteJid;
    const userJid = message.key.participant || message.key.remoteJid;

    // --- Lógica Anti-Link (Versión corregida y única) ---
    const groupSettings = await getGroupSettings(chatId);
    if (groupSettings && groupSettings.antiLinkEnabled && chatId.endsWith('@g.us')) {
        const messageText = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const linkRegex = /(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})(\/[^\s]*)?/gi;

        if (linkRegex.test(messageText)) {
            const groupMetadata = await sock.groupMetadata(chatId);
            const sender = groupMetadata.participants.find(p => p.id === userJid);

            // No aplicar anti-link a los administradores
            if (sender && sender.admin !== 'admin' && sender.admin !== 'superadmin') {
                const user = await findOrCreateUser(userJid, chatId);
                
                await sock.sendMessage(chatId, { delete: message.key });

                user.warnings = (user.warnings || 0) + 1;
                await user.save();

                const warnings = user.warnings;
                const warnLimit = process.env.WARN_LIMIT || 3;

                if (warnings >= warnLimit) {
                    const kickText = `🚫 @${userJid.split('@')[0]} ha sido eliminado por alcanzar el límite de ${warnLimit} advertencias por envío de enlaces.`
                    await sock.sendMessage(chatId, { text: kickText, mentions: [userJid] });
                    await sock.groupParticipantsUpdate(chatId, [userJid], 'remove');
                } else {
                    const warnText = `🚨 *¡ADVERTENCIA!* 🚨\n\n*Usuario:* @${userJid.split('@')[0]}\n*Motivo:* Envío de enlaces no permitido.\n\n*Advertencias:* ${warnings}/${warnLimit}\n\n_Por favor, respeta las reglas del grupo._`;
                    await sock.sendMessage(chatId, { text: warnText, mentions: [userJid] });
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

    // --- Lógica de Comandos ---
    const messageContent = message.message.conversation || message.message.extendedTextMessage?.text || message.message.imageMessage?.caption || message.message.videoMessage?.caption || '';
    if (!messageContent.startsWith(process.env.PREFIX)) {
        return;
    }

    const args = messageContent.slice(process.env.PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = commands.get(commandName);

    if (!command) return;

    // Cooldown
    if (userCooldowns.has(userJid)) {
        const lastCommandTime = userCooldowns.get(userJid);
        if (Date.now() - lastCommandTime < 3000) { // 3 segundos
            return sock.sendMessage(chatId, { text: 'Por favor, espera antes de usar otro comando.' });
        }
    }
    userCooldowns.set(userJid, Date.now());

    try {
        await command.execute(message, args, commands);
    } catch (error) {
        console.error(`Error ejecutando el comando ${commandName}:`, error);
        sock.sendMessage(chatId, { text: '⚙️ Ocurrió un error al intentar ejecutar ese comando.' });
    }
}

module.exports = async (m, commands) => {
    if (m.messages && m.messages.length > 0) {
        const message = m.messages[0];
        if (!message.message) return;

        // Llamar a la función unificada para manejar el mensaje
        await handleMessage(message, commands);
    }
};
