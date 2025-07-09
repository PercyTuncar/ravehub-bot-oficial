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

function getContentType(message) {
    if (!message) return undefined;
    const keys = Object.keys(message);
    const messageTypeKey = keys.find(key => key.endsWith('Message') || key === 'conversation' || key === 'senderKeyDistributionMessage' || key === 'protocolMessage');
    return messageTypeKey ? messageTypeKey : keys[0];
}

function getMessageText(message) {
    if (!message) return '';

    return message.conversation ||
           message.extendedTextMessage?.text ||
           message.imageMessage?.caption ||
           message.videoMessage?.caption ||
           message.buttonsResponseMessage?.selectedDisplayText ||
           message.listResponseMessage?.title ||
           '';
}

module.exports = { 
    getMentions,
    getContentType,
    getMessageText
};
