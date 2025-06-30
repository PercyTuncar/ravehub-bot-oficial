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
        user = new User({
            jid,
            groupId,
            name: userName,
        });
        await user.save();
        console.log(`[DB] Nuevo usuario creado en grupo ${groupId}: ${jid}`);
    }
    return user;
};

module.exports = { findOrCreateUser };
