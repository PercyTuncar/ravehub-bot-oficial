const { findOrCreateUser } = require('./userUtils');

// Objeto para gestionar las sesiones de juego activas
const activeGameSessions = new Map();

// --- Lógica de la Baraja ---
const suits = ['♠️', '♥️', '♦️', '♣️'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const rankValues = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };

function getRandomCard() {
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const rank = ranks[Math.floor(Math.random() * ranks.length)];
    return { suit, rank, value: rankValues[rank] };
}

// --- Funciones de Sesión de Juego ---

/**
 * Inicia una nueva sesión de juego para un usuario.
 * @param {string} userId - El JID del usuario.
 * @param {number} bet - La cantidad apostada.
 */
function startGameSession(userId, bet) {
    const session = {
        stage: 'CHOOSING_SIDE',
        bet,
        timer: null,
    };
    activeGameSessions.set(userId, session);
    console.log(`[GameSession] Sesión iniciada para ${userId} con apuesta de ${bet}`);
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
    const session = activeGameSessions.get(userId);
    if (session && session.timer) {
        clearTimeout(session.timer);
    }
    activeGameSessions.delete(userId);
    console.log(`[GameSession] Sesión finalizada para ${userId}`);
}

module.exports = {
    activeGameSessions,
    getRandomCard,
    startGameSession,
    getGameSession,
    endGameSession,
};
