const { findOrCreateUser, updateHealth } = require("../../utils/userUtils");
const { getEligibleJobs, cooldownRanges } = require("../../utils/levels");
const { getCurrency } = require("../../utils/groupUtils");
const { getSocket } = require("../../bot");
const User = require("../../models/User");

module.exports = {
  name: "work",
  description: "Ganar dinero y XP, pero aumenta el estrés.",
  aliases: ['chambear', 'trabajar'],
  usage: ".work",
  category: "economy",
  async execute(message, args, commands) {
    const sock = getSocket();
    const senderJid = message.key.participant || message.key.remoteJid;
    const chatId = message.key.remoteJid;

    try {
      let user = await findOrCreateUser(senderJid, chatId, message.pushName);
      const currency = await getCurrency(chatId);

      if (user.status && user.status.isDead) {
        return sock.sendMessage(chatId, { text: `💀 @${senderJid.split("@")[0]}, los muertos no trabajan.`, mentions: [senderJid] });
      }

      if (user.status.stress >= 100) {
        const stressMessage = `
😵 *¡DEMASIADO ESTRÉS!* 😵
══════════════════

@${senderJid.split("@")[0]}, tu nivel de estrés ha llegado al límite. No puedes trabajar así.

Necesitas relajarte un poco. Te recomendamos tomar algo para bajar ese estrés.

*Sugerencias:*
- Pisco Sour
- Cerveza Heladita

Puedes ver la tienda con `.shop` y comprar con `.buy`.`;
        return sock.sendMessage(chatId, { text: stressMessage, mentions: [senderJid] });
      }

      if (user.cooldowns.work && user.cooldowns.work > new Date()) {
        const timeLeft = (user.cooldowns.work.getTime() - new Date().getTime()) / 1000;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = Math.ceil(timeLeft % 60);
        let timeString = `${minutes > 0 ? `${minutes}m ` : ""}${seconds}s`;
        return sock.sendMessage(chatId, { text: `⏳ @${senderJid.split("@")[0]}, debes esperar ${timeString} para volver a trabajar.`, mentions: [senderJid] });
      }

      const eligibleJobs = getEligibleJobs(user.level);
      if (eligibleJobs.length === 0) {
        return sock.sendMessage(chatId, { text: "No hay trabajos disponibles para tu nivel actual." });
      }

      const job = eligibleJobs[Math.floor(Math.random() * eligibleJobs.length)];
      const earnings = job.salary;
      const xpGained = Math.floor(earnings / 10);
      const stressGained = 10;

      const userLevel = user.level;
      const range = cooldownRanges[userLevel] || { min: 1, max: 2 };
      const randomCooldownMinutes = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      const newCooldown = new Date(new Date().getTime() + randomCooldownMinutes * 60 * 1000);

      const updatedUser = await User.findOneAndUpdate(
        { _id: user._id, 'status.stress': { $lt: 100 } }, // Condición atómica para evitar trabajar con estrés >= 100
        {
          $inc: {
            'economy.wallet': earnings,
            'xp': xpGained,
            'status.stress': stressGained
          },
          $set: {
            'cooldowns.work': newCooldown,
            'lastInteraction': new Date()
          }
        },
        { new: true } // Devuelve el documento actualizado
      );

      if (!updatedUser) {
        return sock.sendMessage(chatId, { text: 'No pudiste trabajar esta vez, probablemente debido al estrés. Inténtalo de nuevo.' });
      }

      await updateHealth(updatedUser); // Actualizar salud después de cambiar el estrés

      let workResponse = `
*💼 ¡BUEN TRABAJO!* 💼
🔨════════════ 🔨

👤 @${senderJid.split("@")[0]}
🧹 *Puesto:* _${job.name}_
> 🤫 *Detalle:* _${job.description}_
💰 *Salario:* `${currency} ${earnings.toLocaleString()}`
🌟 *XP:* `+${xpGained}`
😵 *Estrés:* `+${stressGained}%` (Total: ${updatedUser.status.stress}%)`;

      await sock.sendMessage(chatId, { text: workResponse, mentions: [senderJid] });

      if (updatedUser.status.stress >= 100) {
        const stressWarning = `
⚠️ *¡ALERTA DE ESTRÉS!* ⚠️
══════════════════

@${senderJid.split("@")[0]}, has alcanzado el 100% de estrés. ¡Es hora de un descanso!

No podrás volver a trabajar hasta que tu nivel de estrés baje.

*Recomendaciones para relajarte:*
- Pisco Sour
- Cerveza Heladita

Usa `.shop` para ver la tienda y `.buy` para comprar algo que te ayude a relajarte.`;
        await sock.sendMessage(chatId, { text: stressWarning, mentions: [senderJid] });
      }

    } catch (error) {
      console.error("Error en el comando work:", error);
      sock.sendMessage(chatId, { text: "Ocurrió un error al procesar el comando de trabajo." });
    }
  },
};
