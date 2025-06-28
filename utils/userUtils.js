const User = require('../models/User');

/**
 * Busca un usuario en la base de datos por su JID. Si no existe, lo crea.
 * Esta función centraliza la lógica para evitar duplicación de código.
 * @param {string} jid - El JID (identificador de WhatsApp) del usuario.
 * @param {string} [name=''] - El nombre (pushName) del usuario, opcional.
 * @returns {Promise<User>} El documento del usuario de la base de datos (encontrado o recién creado).
 */
const findOrCreateUser = async (jid, name = '') => {
    // Busca al usuario por su JID.
    let user = await User.findOne({ jid });

    // Si el usuario no se encuentra, crea uno nuevo.
    if (!user) {
        // Usa el nombre proporcionado o un nombre por defecto si está vacío.
        const userName = name || jid.split('@')[0];
        user = new User({
            jid,
            name: userName,
        });
        await user.save(); // Guarda el nuevo usuario en la base de datos.
    }

    // Devuelve el usuario encontrado o el recién creado.
    return user;
};

module.exports = { findOrCreateUser };
