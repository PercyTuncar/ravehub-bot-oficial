const DjChallenge = require('../../models/DjChallenge');

const sock = require('../../bot').getSocket();

module.exports = {
    name: 'add-dj',
    description: 'Añade un nuevo DJ al Desafío de la Silueta.',
    aliases: ['adddj', 'djadd'],
    adminOnly: true,

    async execute(message, args, commands) {
        const fullArgs = args.join(' ');
        const parts = fullArgs.split('|').map(p => p.trim().replace(/"/g, ''));

        if (parts.length < 7) {
            return message.reply(
                'Formato incorrecto. Usa:\n' +
                '`!add-dj "Nombre" | "url_silueta" | "url_revelada" | "pista1" | "pista2" | "pista3" | "alias1,alias2"`'
            );
        }

        const [name, silhouetteUrl, revealedUrl, hardClue, mediumClue, easyClue, aliasesStr] = parts;
        
        try {
            const newDj = new DjChallenge({
                name: name,
                silhouetteImageUrl: silhouetteUrl,
                revealedImageUrl: revealedUrl,
                clues: {
                    hard: hardClue,
                    medium: mediumClue,
                    easy: easyClue
                },
                aliases: aliasesStr.split(',').map(a => a.trim().toLowerCase())
            });

            await newDj.save();
            sock.sendMessage(message.key.remoteJid, { text: `✅ Desafío para el DJ "${name}" añadido correctamente.` });

        } catch (error) {
            if (error.code === 11000) {
                sock.sendMessage(message.key.remoteJid, { text: `❌ Error: El DJ "${name}" ya existe en la base de datos.` });
            } else {
                console.error(error);
                sock.sendMessage(message.key.remoteJid, { text: '❌ Hubo un error inesperado al guardar el desafío.' });
            }
        }
    }
};
