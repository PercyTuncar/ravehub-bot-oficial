const { findOrCreateUser } = require('../../utils/userUtils');
const { jobsByLevel, getLevelName, allJobs } = require('../../utils/levels');

module.exports = {
  name: 'trabajos',
  description: 'Ver lista de trabajos.',
  aliases: ['jobs', 'joblist'],
  usage: '.trabajos',
  category: 'utility',
  async execute(sock, message) {
    const senderJid = message.key.participant || message.key.remoteJid;
    const chatId = message.key.remoteJid;

    // Verificar si el comando se usa en un grupo
    if (chatId.endsWith('@g.us')) {
      try {
        const groupMetadata = await sock.groupMetadata(chatId);
        const sender = groupMetadata.participants.find(p => p.id === senderJid);

        // Si el que envía no es admin o superadmin, no permitir el comando
        if (sender && sender.admin !== 'admin' && sender.admin !== 'superadmin') {
          return await sock.sendMessage(chatId, { text: '🔒 Este comando solo puede ser utilizado por los administradores del grupo.' });
        }
      } catch (error) {
        console.error('Error al verificar permisos de administrador:', error);
        return await sock.sendMessage(chatId, { text: '❌ No pude verificar tus permisos. Inténtalo de nuevo.' });
      }
    }

    try {
      const user = await findOrCreateUser(senderJid, chatId, message.pushName);
      const userLevel = user.level;

      let response = `💼 *Lista de Trabajos Disponibles* 💼\n\n`;
      response += `Hola *${user.pushName}*, actualmente eres *${getLevelName(userLevel)}* (Nivel ${userLevel}).\n`;
      response += `Estos son los trabajos, sus salarios y el nivel requerido. ¡Sigue así para desbloquearlos todos!\n\n`;

      // Agrupar trabajos por nivel desde allJobs para tener todos los detalles
      const detailedJobsByLevel = {};
      for (const job of allJobs) {
        if (!detailedJobsByLevel[job.level]) {
          detailedJobsByLevel[job.level] = [];
        }
        detailedJobsByLevel[job.level].push(job);
      }

      for (const level in detailedJobsByLevel) {
        const levelName = getLevelName(parseInt(level));
        response += `*${levelName} (Requiere Nivel ${level})*\n`;

        const jobsForLevel = detailedJobsByLevel[level];
        jobsForLevel.forEach(job => {
          const icon = userLevel >= job.level ? '✅' : '🔒';
          response += `  ${icon} ${job.name} (*${job.salary}* 💵)\n`;
        });
        response += '\n';
      }

      response += `*¡Sigue esforzándote para ganar más RaveCoins!* 💰`;

      await sock.sendMessage(chatId, { text: response.trim() });

    } catch (error) {
        console.error('Error en el comando trabajos:', error);
        await sock.sendMessage(chatId, { text: '❌ Ocurrió un error al mostrar la lista de trabajos.' });
    }
  },
};
