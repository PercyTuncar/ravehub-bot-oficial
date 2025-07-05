const User = require('../models/User');

async function getMentions(message) {
    let mentions = [];
    if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
        mentions = message.message.extendedTextMessage.contextInfo.mentionedJid;
    } else if (message.message?.contextInfo?.mentionedJid) { // Fallback for other message types
        mentions = message.message.contextInfo.mentionedJid;
    }
    return mentions;
}

module.exports = { getMentions };
