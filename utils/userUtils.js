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

    // Si el usuario no existe, lo creamos.
    if (!user) {
        // Usar el pushName si está disponible, de lo contrario, el JID como último recurso.
        const userName = (name && name.trim() !== '') ? name : jid.split('@')[0];
        try {
            user = new User({
                jid,
                groupId,
                name: userName,
            });
            await user.save();
            console.log(`[DB] Nuevo usuario creado en grupo ${groupId}: ${jid} con nombre ${userName}`);
        } catch (err) {
            // Manejo de condición de carrera: si el usuario se crea entre la búsqueda y el guardado.
            if (err.code === 11000) {
                user = await User.findOne({ jid, groupId });
            } else {
                throw err;
            }
        }
    } else {
        // Si el usuario ya existe, verificamos si su nombre ha cambiado.
        // Actualizar solo si el nuevo nombre (pushName) es válido y diferente al guardado.
        if (name && name.trim() !== '' && user.name !== name) {
            console.log(`[DB] Actualizando nombre para ${jid} en grupo ${groupId}. De: "${user.name}" a: "${name}"`);
            user.name = name;
            await user.save();
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

/**
 * Calcula y actualiza la salud de un usuario basándose en su hambre, sed y estrés.
 * Esta función MODIFICA el objeto de usuario pero NO lo guarda en la base de datos.
 * El guardado debe ser manejado por la función que la llama para asegurar consistencia.
 * @param {User} user - El documento del usuario de Mongoose a modificar.
 */
const updateHealth = (user) => {
    if (!user || !user.status) {
        console.error('[Health] Se intentó actualizar la salud de un usuario inválido.');
        return;
    }

    const { hunger, thirst, stress } = user.status;

    // Aplicar la fórmula: Salud = (Hambre + Sed + (100 - Estrés)) / 3
    const newHealth = Math.round((hunger + thirst + (100 - stress)) / 3);

    // Asegurarse de que la salud no sea menor que 0 ni mayor que 100
    user.status.health = Math.max(0, Math.min(100, newHealth));

    // Comprobar si el usuario ha muerto. Si la salud es 0 o menos, y no estaba muerto, se marca como muerto.
    if (user.status.health <= 0 && !user.status.isDead) {
        user.status.isDead = true;
        console.log(`[Health] El usuario ${user.name} (${user.jid}) ha muerto debido a su estado crítico.`);
    }
    // Nota: La resurrección (pasar de isDead: true a false) debe ser un evento manejado por un comando específico (ej. .revivir)
    // y no ocurre automáticamente solo porque los stats cambien.
};


module.exports = { findOrCreateUser, updateGameStats, updateHealth };
