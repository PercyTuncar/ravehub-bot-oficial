module.exports = {
    name: 'menu',
    description: 'Muestra el menú de comandos.',
    category: 'utility',
    execute(message, args, commands) {
        let menu = `╭───≽ *MENU DE COMANDOS* ≼───╮
│
`;
        const categories = {};

        commands.forEach(command => {
            if (!categories[command.category]) {
                categories[command.category] = [];
            }
            categories[command.category].push(command.name);
        });

        for (const category in categories) {
            menu += `│ ╟──≽ *${category.toUpperCase()}* ≼───╮\n`;
            categories[category].forEach(commandName => {
                menu += `│ ╰» .${commandName}\n`;
            });
        }
        menu += `│\n╰──────────≽`;

        this.sock.sendMessage(message.key.remoteJid, { text: menu });
    }
};
