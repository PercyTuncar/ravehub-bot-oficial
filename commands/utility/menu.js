module.exports = {
    name: 'menu',
    description: 'Muestra el menú de comandos disponibles.',
    category: 'utility',
    aliases: ['help', 'commands'],
    execute(sock, message, args, commands) {
        const uniqueCommands = new Map();
        commands.forEach(command => {
            if (!uniqueCommands.has(command.name)) {
                uniqueCommands.set(command.name, command);
            }
        });

        const categories = {};
        uniqueCommands.forEach(command => {
            if (!categories[command.category]) {
                categories[command.category] = [];
            }
            categories[command.category].push(command);
        });

        let menu = `*╭───≽ 🤖 MENÚ DE COMANDOS ≼───*\n*│*\n`;

        for (const category in categories) {
            const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
            let categoryIcon = "📁";
            if (category === "economy") categoryIcon = "💰";
            if (category === "admin") categoryIcon = "🛠️";
            if (category === "utility") categoryIcon = "⚙️";

            menu += `*│* ╭─≽ *${categoryIcon} ${categoryName}*\n`;
            categories[category].forEach((command) => {
                menu += `*│* │ • *.${command.name}*\n`;
            });
            menu += `*│* ╰─────────────────≽\n*│*\n`;
        }
        menu += `*╰─ Usa .help <comando> para más info ─*`;

        sock.sendMessage(message.key.remoteJid, { text: menu });
    },
};
