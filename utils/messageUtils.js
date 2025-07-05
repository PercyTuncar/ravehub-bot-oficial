const User = require('../models/User');

async function getMentions(message) {
    let mentions = [];
    if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
        mentions = message.message.extendedTextMessage.contextInfo.mentionedJid;
    }
    return mentions;
}

module.exports = { getMentions };
