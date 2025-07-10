const { logger } = require('../config/logger');

const messageQueue = [];
let isProcessing = false;
const MESSAGE_INTERVAL = 1500; // Interval in milliseconds (1.5 seconds)

const processQueue = async () => {
    if (messageQueue.length === 0) {
        isProcessing = false;
        return;
    }

    isProcessing = true;
    const { sock, jid, message, options, retries } = messageQueue.shift();

    try {
        await sock.sendMessage(jid, message, options);
    } catch (error) {
        logger.error(`Error sending message to ${jid}:`, error);
        if (error.data === 429 && retries > 0) {
            logger.info(`Rate limit hit. Re-queuing message to ${jid}. Retries left: ${retries - 1}`);
            // Add back to the front of the queue with a delay
            setTimeout(() => {
                messageQueue.unshift({ sock, jid, message, options, retries: retries - 1 });
            }, MESSAGE_INTERVAL * 5); // Wait longer if rate limited
        } else if (retries > 0) {
            logger.info(`Retrying message to ${jid}, retries left: ${retries - 1}`);
            // Re-add to the front of the queue for immediate retry for other errors
            messageQueue.unshift({ sock, jid, message, options, retries: retries - 1 });
        } else {
            logger.error(`Failed to send message to ${jid} after multiple retries.`);
        }
    }

    setTimeout(processQueue, MESSAGE_INTERVAL);
};

const addMessageToQueue = (sock, jid, message, options, retries = 3) => {
    messageQueue.push({ sock, jid, message, options, retries });
    if (!isProcessing) {
        processQueue();
    }
};

module.exports = {
    addMessageToQueue,
};
