const GroupSettings = require('../models/GroupSettings');
const { getSocket } = require('../bot');

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
        let settings = await findOrCreateGroup(groupId);
        // Asegurarse de que siempre haya una divisa por defecto si no existe
        if (settings && !settings.currency) {
            settings.currency = '$'; 
        }
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
        return settings ? settings.currency : '$'; // Usar el campo 'currency' y un default
    } catch (error) {
        console.error("Error fetching group currency:", error);
        return '$';
    }
}

/**
 * Clears the cached settings for a specific group.
 * @param {string} groupId The JID of the group.
 */
function clearGroupSettingsCache(groupId) {
    groupSettingsCache.delete(groupId);
}

/**
 * Checks if a user is an admin in a group.
 * @param {string} groupId The JID of the group.
 * @param {string} userId The JID of the user.
 * @returns {Promise<boolean>}
 */
async function isAdmin(groupId, userId) {
    const sock = getSocket();
    try {
        const metadata = await sock.groupMetadata(groupId);
        const participant = metadata.participants.find(p => p.id === userId);
        return !!participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
    } catch (error) {
        console.error(`Error checking admin status for ${userId} in ${groupId}:`, error);
        return false;
    }
}

module.exports = {
    findOrCreateGroup,
    getGroupSettings,
    getCurrency,
    clearGroupSettingsCache,
    isAdmin,
};
