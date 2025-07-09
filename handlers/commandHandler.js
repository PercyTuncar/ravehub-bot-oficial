const fs = require('fs');
const path = require('path');

module.exports = () => {
    const commands = new Map();
    const commandPath = path.join(__dirname, '..', 'commands');
    const commandFolders = fs.readdirSync(commandPath).filter(folder => 
        fs.statSync(path.join(commandPath, folder)).isDirectory()
    );

    for (const folder of commandFolders) {
        const commandFiles = fs.readdirSync(path.join(__dirname, '..', 'commands', folder)).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const command = require(`../commands/${folder}/${file}`);
            if (command.name) {
                commands.set(command.name, command);
            }
            if (command.aliases && Array.isArray(command.aliases)) {
                command.aliases.forEach(alias => {
                    commands.set(alias, command);
                });
            }
        }
    }

    return commands;
};
