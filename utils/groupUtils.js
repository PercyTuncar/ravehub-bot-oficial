const GroupSettings = require('../models/GroupSettings');

const currencyCache = new Map();

async function getCurrency(groupId) {
    if (currencyCache.has(groupId)) {
        return currencyCache.get(groupId);
    }

    if (!groupId || !groupId.endsWith('@g.us')) {
        return '💵'; // Default for DMs or invalid groupId
    }

    try {
        const settings = await GroupSettings.findOne({ groupId });
        const symbol = settings?.currencySymbol || '💵';
        currencyCache.set(groupId, symbol);
        return symbol;
    } catch (error) {
        console.error('Error fetching currency symbol:', error);
        return '💵'; // Fallback to default
    }
}

module.exports = { getCurrency };
