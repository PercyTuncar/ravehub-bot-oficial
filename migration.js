require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User'); // Importa el nuevo modelo

// Define el esquema ANTIGUO para poder leer los datos existentes
const oldUserSchema = new mongoose.Schema({
    jid: String,
    groupId: String,
    name: String,
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    economy: {
        wallet: { type: Number, default: 1000 },
        bank: { type: Number, default: 0 }
    },
    // Añade otros campos del esquema antiguo que necesites migrar
}, { strict: false }); // `strict: false` permite leer campos no definidos en el esquema

const OldUser = mongoose.model('User_old', oldUserSchema, 'users'); // Lee de la colección 'users'

const migrateUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Conectado a la base de datos para la migración.');

        const oldUsers = await OldUser.find({});
        console.log(`Se encontraron ${oldUsers.length} documentos de usuarios para migrar.`);

        if (oldUsers.length === 0) {
            console.log('No hay usuarios que migrar.');
            return;
        }

        const newUsersMap = new Map();

        for (const oldUser of oldUsers) {
            if (!oldUser.jid) continue; // Omitir documentos inválidos

            if (newUsersMap.has(oldUser.jid)) {
                // Si el usuario ya existe en el mapa, solo añade el grupo si es nuevo
                const existingUser = newUsersMap.get(oldUser.jid);
                if (oldUser.groupId && !existingUser.groups.some(g => g.chatId === oldUser.groupId)) {
                    existingUser.groups.push({ chatId: oldUser.groupId, joinedAt: new Date() });
                }
            } else {
                // Si es la primera vez que vemos este JID, creamos el nuevo usuario
                const newUser = {
                    jid: oldUser.jid,
                    name: oldUser.name,
                    level: oldUser.level,
                    xp: oldUser.xp,
                    economy: oldUser.economy,
                    groups: oldUser.groupId ? [{ chatId: oldUser.groupId, joinedAt: new Date() }] : [],
                    // Copia aquí otros campos que quieras conservar
                };
                newUsersMap.set(oldUser.jid, newUser);
            }
        }

        const newUsersArray = Array.from(newUsersMap.values());
        console.log(`Se consolidaron en ${newUsersArray.length} usuarios únicos.`);

        // Borrar la colección antigua y re-insertar los datos nuevos
        console.log('Preparando para actualizar la base de datos...');
        await User.deleteMany({});
        console.log('Colección de usuarios existente eliminada.');
        
        await User.insertMany(newUsersArray);
        console.log(`${newUsersArray.length} usuarios migrados exitosamente a la nueva estructura.`);

    } catch (error) {
        console.error('Ocurrió un error durante la migración:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Desconectado de la base de datos.');
    }
};

// Ejecutar la migración
migrateUsers();