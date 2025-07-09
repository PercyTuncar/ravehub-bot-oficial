const { getSocket } = require('../../bot');
const Group = require('../../models/Group');
const { findOrCreateUser } = require('../../utils/userUtils');

module.exports = {
    name: 'activar-rp',
    description: 'Activa el sistema de RP en el grupo actual y registra a todos los miembros.',
    category: 'admin',
    async execute(message, args) {
        const sock = getSocket();
        const chatId = message.key.remoteJid;
        const senderId = message.key.participant || message.key.remoteJid;

        // Verificar si el comando se usa en un grupo
        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, { text: 'Este comando solo se puede usar en grupos.' });
        }

        // Verificar si el que ejecuta el comando es el owner del bot
        const ownerNumber = process.env.OWNER_NUMBER;
        if (!ownerNumber || senderId !== `${ownerNumber}@s.whatsapp.net`) {
            return sock.sendMessage(chatId, { text: '🔒 Solo el administrador del bot puede usar este comando.' });
        }

        try {
            // Obtener metadatos del grupo
            const groupMetadata = await sock.groupMetadata(chatId);
            const groupName = groupMetadata.subject;

            // Buscar o crear documento del grupo
            let group = await Group.findOne({ groupId: chatId });
            if (!group) {
                group = new Group({
                    groupId: chatId,
                    isRpActive: true,
                    groupName: groupName
                });
            } else {
                group.isRpActive = true;
                group.groupName = groupName; // Actualizar nombre por si cambió
            }
            await group.save();

            // Enviar confirmación de activación
            await sock.sendMessage(chatId, { 
                text: '🎭 ¡Sistema de RP activado exitosamente!\n\nIniciando registro de miembros...' 
            });

            // Obtener todos los participantes del grupo
            const participants = groupMetadata.participants;
            let newMembers = 0;
            let existingMembers = 0;

            // Registrar cada participante
            for (const participant of participants) {
                const userJid = participant.id;
                
                try {
                    // Verificar si el usuario ya existe
                    const User = require('../../models/User');
                    const existingUser = await User.findOne({ jid: userJid, groupId: chatId });
                    
                    if (!existingUser) {
                        // Crear nuevo usuario
                        await findOrCreateUser(userJid, chatId, 'Miembro del grupo');
                        newMembers++;
                    } else {
                        existingMembers++;
                    }
                } catch (error) {
                    console.error(`Error registrando usuario ${userJid}:`, error);
                }
            }

            // Enviar resumen
            const summaryText = `📊 **Registro completo:**\n\n` +
                `✅ Nuevos miembros registrados: ${newMembers}\n` +
                `👤 Miembros ya existentes: ${existingMembers}\n` +
                `📝 Total de participantes: ${participants.length}\n\n` +
                `¡El sistema de RP está ahora activo en este grupo! 🎮`;

            await sock.sendMessage(chatId, { text: summaryText });

        } catch (error) {
            console.error('Error en comando activar-rp:', error);
            await sock.sendMessage(chatId, { 
                text: '❌ Ocurrió un error al activar el sistema de RP. Inténtalo de nuevo.' 
            });
        }
    }
};