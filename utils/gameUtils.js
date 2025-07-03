const activeGameSessions = new Map();

/**
 * Inicia una nueva sesión de juego para un usuario.
 * @param {string} userId - El JID del usuario.
 * @param {string} gameName - El nombre del juego.
 * @param {object} sessionData - Los datos de la sesión del usuario.
 */
function startGameSession(userId, gameName, sessionData) {
    activeGameSessions.set(userId, { game: gameName, ...sessionData });
    console.log(`[GameSession] Sesión de ${gameName} iniciada para ${userId}`);
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
function endGameSession(userId) {
    if (activeGameSessions.has(userId)) {
        activeGameSessions.delete(userId);
        console.log(`[GameSession] Sesión finalizada para ${userId}`);
    }
}

module.exports = {
    startGameSession,
    getGameSession,
    endGameSession,
    activeGameSessions
};
