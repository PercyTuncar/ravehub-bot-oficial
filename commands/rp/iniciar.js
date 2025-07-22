const User = require('../../models/User');
const leproso = 'https://i.imgur.com/7Vba322.jpeg';

module.exports = {
    name: 'iniciar',
    description: 'Crea un perfil de jugador o muestra ayuda si ya existe.',
    aliases: ['start', 'comenzar'],
    category: 'rp',
    async execute(message, args, client) {
        const senderId = message.key.participant || message.key.remoteJid;
        const groupId = message.key.remoteJid;
        const pushName = message.pushName || 'Sin Nombre';

        let user = await User.findOne({ jid: senderId, groupId });

        if (user) {
            await client.sendMessage(groupId, { text: 'Ya tienes un perfil en este grupo. Usa `.me` para ver tu perfil.' });
        } else {
            const newUser = new User({
                jid: senderId,
                groupId,
                name: pushName,
                status: {
                    hunger: 100,
                    thirst: 100,
                    stress: 0,
                    health: 100,
                    isDead: false,
                },
                economy: {
                    wallet: 100,
                },
                lastInteraction: Date.now(),
            });
            await newUser.save();

            const caption = `¡Bienvenido a RaveHub RP, @${senderId.split('@')[0]}! Tu aventura comienza ahora. Se ha creado tu perfil.\n\nUsa \`.me\` para ver tus estadísticas.\nComandos básicos: \`.comer\`, \`.beber\`, \`.trabajar\`, \`.tienda\`, \`.relajarse\`.`;
            
            await client.sendMessage(
                groupId, 
                { 
                    image: { url: leproso },
                    caption: caption,
                    mentions: [senderId]
                }
            );
        }
    },
};
