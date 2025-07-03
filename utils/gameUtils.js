const activeGameSessions = new Map();

/**
 * Inicia una nueva sesión de juego para un usuario.
 * @param {string} userId - El JID del usuario.
 * @param {object} sessionData - Los datos de la sesión del usuario.
 */
function addGameSession(userId, sessionData) {
    activeGameSessions.set(userId, sessionData);
    console.log(`[GameSession] Sesión iniciada para ${userId}`);
}

/**
 * Obtiene la sesión de juego activa de un usuario.
 * @param {string} userId - El JID del usuario.
 * @returns {object|undefined} La sesión del usuario.
 */
function getGameSession(userId) {
    return activeGameSessions.get(userId);
}

/**
 * Finaliza la sesión de juego de un usuario.
 * @param {string} userId - El JID del usuario.
 */
function removeGameSession(userId) {
    activeGameSessions.delete(userId);
    console.log(`[GameSession] Sesión finalizada para ${userId}`);
}

module.exports = {
    addGameSession,
    getGameSession,
    removeGameSession,
};
