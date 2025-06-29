const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'menu',
    description: 'Muestra el menú de comandos o la información de un comando específico.',
    category: 'utility',
    aliases: ['help', 'commands'],
    async execute(sock, message, args) {
        const jid = message.key.remoteJid;

        const commandPath = path.join(__dirname, '..');
        const commandFolders = fs.readdirSync(commandPath).filter(folder =>
            fs.statSync(path.join(commandPath, folder)).isDirectory()
        );

        let menuText = '*🤖 MENÚ DE COMANDOS DE RAVEHUB 🤖*\n\n';

        for (const folder of commandFolders) {
            menuText += `*╭───「 ${folder.toUpperCase()} 」*\n`;
            const commandFiles = fs.readdirSync(path.join(commandPath, folder)).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                const command = require(`../${folder}/${file}`);
                if (command.name && command.description) {
                    menuText += `*│* • *${command.name}*\n`;
                    menuText += `*│*    _${command.description}_\n`;
                    if (command.usage) {
                        menuText += `*│*    Uso: \`${command.usage}\`\n`;
                    }
                }
            }
            menuText += `*╰────────────*\n\n`;
        }

        menuText += `_Para más detalles sobre un comando, usa .help <comando>_`;

        await sock.sendMessage(jid, { text: menuText.trim() });
    },
};
