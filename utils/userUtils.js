const User = require('../models/User');

/**
 * Busca un usuario en la base de datos por su JID y groupId. Si no existe, lo crea.
 * Esta función centraliza la lógica para evitar duplicación de código.
 * @param {string} jid - El JID (identificador de WhatsApp) del usuario.
 * @param {string} groupId - El ID del grupo.
 * @param {string} [name=''] - El nombre (pushName) del usuario, opcional.
 * @returns {Promise<User>} El documento del usuario de la base de datos (encontrado o recién creado).
 */
const findOrCreateUser = async (jid, groupId, name = '') => {
    let user = await User.findOne({ jid, groupId });
    if (!user) {
        const userName = name || jid.split('@')[0];
        try {
            user = new User({
                jid,
                groupId,
                name: userName,
            });
            await user.save();
            console.log(`[DB] Nuevo usuario creado en grupo ${groupId}: ${jid}`);
        } catch (err) {
            // Si ocurre un error de duplicado, buscar el usuario existente
            if (err.code === 11000) {
                user = await User.findOne({ jid, groupId });
            } else {
                throw err;
            }
        }
    }
    return user;
};

/**
 * Actualiza las estadísticas de juego para un usuario.
 * @param {string} jid - El JID del usuario.
 * @param {string} groupId - El ID del grupo.
 * @param {string} gameName - El nombre del juego (ej. 'cartaMayor').
 * @param {object} statsUpdate - Objeto con las estadísticas a actualizar.
 * @param {number} [statsUpdate.wins=0] - Victorias a sumar.
 * @param {number} [statsUpdate.losses=0] - Derrotas a sumar.
 * @param {number} [statsUpdate.ties=0] - Empates a sumar.
 * @param {number} [statsUpdate.moneyChange=0] - Cambio en el dinero.
 */
const updateGameStats = async (jid, groupId, gameName, statsUpdate) => {
    try {
        const user = await findOrCreateUser(jid, groupId);
        if (!user) {
            console.error(`[DB] Usuario no encontrado con JID: ${jid} en grupo ${groupId}`);
            return;
        }

        const { wins = 0, losses = 0, ties = 0, moneyChange = 0 } = statsUpdate;

        if (!user.gameStats) {
            user.gameStats = {};
        }
        if (!user.gameStats[gameName]) {
            user.gameStats[gameName] = {
                gamesPlayed: 0,
                wins: 0,
                losses: 0,
                ties: 0,
                moneyWon: 0,
                moneyLost: 0,
            };
        }

        const stats = user.gameStats[gameName];
        
        stats.gamesPlayed += (wins + losses + ties);
        stats.wins += wins;
        stats.losses += losses;
        stats.ties += ties;

        if (moneyChange > 0) {
            stats.moneyWon += moneyChange;
        } else if (moneyChange < 0) {
            stats.moneyLost += Math.abs(moneyChange);
        }

        await user.save();
    } catch (error) {
        console.error(`[DB] Error al actualizar estadísticas de juego para ${jid}:`, error);
    }
};

module.exports = { findOrCreateUser, updateGameStats };
