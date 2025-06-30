const GroupSettings = require('../models/GroupSettings');

const groupCurrencyCache = new Map();
const DEFAULT_CURRENCY = '💵';

/**
 * Retrieves the currency symbol for a given group, with caching.
 * @param {string} groupId The JID of the group.
 * @returns {Promise<string>}
 */
async function getCurrency(groupId) {
    if (groupCurrencyCache.has(groupId)) {
        return groupCurrencyCache.get(groupId);
    }

    try {
        const settings = await GroupSettings.findOne({ groupId });
        const currency = settings ? settings.currencySymbol : DEFAULT_CURRENCY;
        groupCurrencyCache.set(groupId, currency);
        return currency;
    } catch (error) {
        console.error("Error fetching group currency:", error);
        return DEFAULT_CURRENCY;
    }
}

module.exports = { getCurrency };
