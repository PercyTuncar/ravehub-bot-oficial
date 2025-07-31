const fs = require('fs').promises;
const path = require('path');
const challengeHandler = require('./challengeHandler');
const User = require('../models/User');
const { ongoingProposals } = require('../commands/love/propose'); // Importar propuestas

const commandMap = new Map();
const commandCooldowns = new Map();

async function loadCommands(dir) {
    const commandFiles = await fs.readdir(dir);
    for (const file of commandFiles) {
        const fullPath = path.join(dir, file);
        const stat = await fs.lstat(fullPath);
        if (stat.isDirectory()) {
            await loadCommands(fullPath);
        } else if (file.endsWith('.js')) {
            try {
                delete require.cache[require.resolve(fullPath)];
                const command = require(fullPath);
                if (command.name && command.execute) {
                    commandMap.set(command.name, command);
                    if (command.aliases && Array.isArray(command.aliases)) {
                        command.aliases.forEach(alias => {
                            commandMap.set(alias, command);
                        });
                    }
                }
            } catch (error) {
                console.error(`Error al cargar el comando ${fullPath}:`, error);
            }
        }
    }
}

const initialize = async () => {
    await loadCommands(path.join(__dirname, '../commands'));
    console.log('[INFO] Todos los comandos han sido cargados exitosamente.');
};

const commandHandler = async (client, message) => {
    const body = message.conversation || message.message?.conversation || message.message?.extendedTextMessage?.text || '';
    const chatId = message.key.remoteJid;
    const senderJid = message.key.participant || message.key.remoteJid;
    const prefix = '.';

    if (!body || !senderJid) {
        return;
    }

    // --- LÓGICA DE PROPUESTAS DE PAREJA ---
    if (!body.startsWith(prefix)) {
        for (const [proposalKey, proposal] of ongoingProposals.entries()) {
            if (chatId === proposal.proposer.jid.split('@')[0] + '@g.us' && senderJid === proposal.proposed.jid) {
                const response = body.toLowerCase().trim();

                if (response === 'acepto') {
                    clearTimeout(proposal.timer);
                    
                    const proposerUpdate = { 'loveInfo.relationshipStatus': 'En una relación', 'loveInfo.partnerJid': proposal.proposed.jid, 'loveInfo.partnerName': proposal.proposed.name, 'loveInfo.relationshipStartDate': new Date() };
                    const proposedUpdate = { 'loveInfo.relationshipStatus': 'En una relación', 'loveInfo.partnerJid': proposal.proposer.jid, 'loveInfo.partnerName': proposal.proposer.name, 'loveInfo.relationshipStartDate': new Date() };

                    await User.findOneAndUpdate({ jid: proposal.proposer.jid }, { $set: proposerUpdate });
                    await User.findOneAndUpdate({ jid: proposal.proposed.jid }, { $set: proposedUpdate });

                    await client.sendMessage(chatId, { text: `¡Felicidades! 🎉 @${proposal.proposer.jid.split('@')[0]} y @${proposal.proposed.jid.split('@')[0]} ahora son pareja.`, mentions: [proposal.proposer.jid, proposal.proposed.jid] });
                    ongoingProposals.delete(proposalKey);
                    return;
                }

                if (response === 'rechazo') {
                    clearTimeout(proposal.timer);
                    await client.sendMessage(chatId, { text: `💔 @${proposal.proposed.jid.split('@')[0]} ha rechazado la propuesta de @${proposal.proposer.jid.split('@')[0]}.`, mentions: [proposal.proposer.jid, proposal.proposed.jid] });
                    ongoingProposals.delete(proposalKey);
                    return;
                }
            }
        }
    }
    // --- FIN LÓGICA DE PROPUESTAS ---

    // --- LÓGICA DEL DESAFÍO ---
    if (challengeHandler.isChallengeActive(chatId)) {
        if (!body.startsWith(prefix)) {
            challengeHandler.handleAnswer({ body, key: message.key, participant: senderJid, pushName: message.pushName || '' }, client);
            return;
        }
    }
    // --- FIN LÓGICA DESAFÍO ---

    if (!body.startsWith(prefix)) {
        return;
    }

    const args = body.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = commandMap.get(commandName);

    if (!command) {
        return;
    }

    try {
        await command.execute(message, args, client);
    } catch (error) {
        console.error(`[ERROR] Ocurrió un error al ejecutar el comando "${command.name}":`, error);
        await client.sendMessage(chatId, { text: '🤖 ¡Ups! Hubo un error al intentar ejecutar ese comando.' });
    }
};

module.exports = {
    commandHandler,
    initialize,
    commandMap
};
