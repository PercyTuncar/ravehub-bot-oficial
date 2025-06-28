const fs = require('fs');
const path = require('path');

module.exports = () => {
    const commands = new Map();
    const commandFolders = ['admin', 'economy', 'utility'];

    for (const folder of commandFolders) {
        const commandFiles = fs.readdirSync(path.join(__dirname, '..', 'commands', folder)).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const command = require(`../commands/${folder}/${file}`);
            commands.set(command.name, command);
        }
    }

    return commands;
};
