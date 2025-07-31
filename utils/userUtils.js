const User = require('../models/User');

const findOrCreateUser = async (jid, chatId, name = '') => {
    let user = await User.findOne({ jid });

    if (user) {
        // Si el usuario existe, verifica si el grupo ya está en su lista
        const groupExists = user.groups.some(g => g.chatId === chatId);
        let needsSave = false;

        if (!groupExists) {
            user.groups.push({ chatId, joinedAt: new Date() });
            needsSave = true;
            console.log(`[DB] Usuario ${jid} añadido al grupo ${chatId}`);
        }

        // Actualizar el nombre si ha cambiado
        if (name && name.trim() !== '' && user.name !== name) {
            user.name = name;
            needsSave = true;
            console.log(`[DB] Actualizando nombre para ${jid}. De: "${user.name}" a: "${name}"`);
        }

        if (needsSave) {
            await user.save();
        }

    } else {
        // Si el usuario no existe, lo creamos con el grupo actual
        const userName = (name && name.trim() !== '') ? name : jid.split('@')[0];
        try {
            user = new User({
                jid,
                name: userName,
                groups: [{ chatId, joinedAt: new Date() }]
            });
            await user.save();
            console.log(`[DB] Nuevo usuario creado: ${jid} en grupo ${chatId}`);
        } catch (err) {
            if (err.code === 11000) { // Manejo de condición de carrera
                user = await User.findOne({ jid });
            } else {
                console.error("Error al crear nuevo usuario:", err);
                throw err;
            }
        }
    }

    return user;
};

const updateHealth = (user) => {
    if (!user || !user.status) {
        console.error('[Health] Se intentó actualizar la salud de un usuario inválido.');
        return;
    }

    const { hunger, thirst, stress } = user.status;
    let health = 100;

    if (hunger < 20) health -= (20 - hunger);
    if (thirst < 20) health -= (20 - thirst);
    health -= Math.round(stress * 0.5);

    user.status.health = Math.max(0, Math.min(100, health));

    if (user.status.health <= 0 && !user.status.isDead) {
        user.status.isDead = true;
        console.log(`[Health] El usuario ${user.name} (${user.jid}) ha muerto.`);
    }
};

module.exports = { findOrCreateUser, updateHealth };