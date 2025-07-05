const GroupSettings = require('../models/GroupSettings');

const groupSettingsCache = new Map();

/**
 * Finds a group's settings document, creating one if it doesn't exist.
 * @param {string} groupId The JID of the group.
 * @returns {Promise<import('mongoose').Document>}
 */
async function findOrCreateGroup(groupId) {
    let settings = await GroupSettings.findOne({ groupId });
    if (!settings) {
        settings = new GroupSettings({ groupId });
        await settings.save();
    }
    return settings;
}

/**
 * Retrieves the settings for a given group, with caching.
 * @param {string} groupId The JID of the group.
 * @returns {Promise<object|null>}
 */
async function getGroupSettings(groupId) {
    if (groupSettingsCache.has(groupId)) {
        return groupSettingsCache.get(groupId);
    }

    try {
        const settings = await findOrCreateGroup(groupId);
        if (settings) {
            groupSettingsCache.set(groupId, settings);
        }
        return settings;
    } catch (error) {
        console.error("Error fetching group settings:", error);
        return null;
    }
}

/**
 * Retrieves the currency symbol for a given group.
 * @param {string} groupId The JID of the group.
 * @returns {Promise<string>}
 */
async function getCurrency(groupId) {
    try {
        const settings = await getGroupSettings(groupId);
        return settings ? settings.currency : 'S/'; // Default currency
    } catch (error) {
        console.error("Error fetching group currency:", error);
        return 'S/';
    }
}

module.exports = { findOrCreateGroup, getGroupSettings, getCurrency };
