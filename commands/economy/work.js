const { findOrCreateUser, updateHealth } = require("../../utils/userUtils");
const { getEligibleJobs, cooldownRanges } = require("../../utils/levels");
const { getCurrency } = require("../../utils/groupUtils");
const { getSocket } = require("../../bot");
const User = require("../../models/User");

module.exports = {
  name: "work",
  description: "Ganar dinero y XP, pero aumenta el estrés.",
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
        return sock.sendMessage(
          chatId,
          {
            text: `💀 @${senderJid.split("@")[0]}, los muertos no trabajan.`,
            mentions: [senderJid],
          }
        );
      }

      // --- Nueva funcionalidad: Bloqueo por estrés ---
      if (user.status.stress >= 100) {
        const stressMessage = `
😵 *¡DEMASIADO ESTRÉS!* 😵
══════════════════

@${senderJid.split("@")[0]}, tu nivel de estrés ha llegado al límite. No puedes trabajar así.

Necesitas relajarte un poco. Te recomendamos tomar algo para bajar ese estrés.

*Sugerencias:*
- Pisco Sour
- Cerveza Heladita

Puedes ver la tienda con \`.shop\` y comprar con \`.buy\`.
        `;
        return sock.sendMessage(chatId, { text: stressMessage, mentions: [senderJid] });
      }

      if (user.cooldowns.work && user.cooldowns.work > new Date()) {
        const timeLeft =
          (user.cooldowns.work.getTime() - new Date().getTime()) / 1000;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = Math.ceil(timeLeft % 60);
        let timeString = `${minutes > 0 ? `${minutes}m ` : ""}${seconds}s`;
        return sock.sendMessage(
          chatId,
          {
            text: `⏳ @${senderJid.split("@")[0]}, debes esperar ${timeString} para volver a trabajar.`,
            mentions: [senderJid],
          }
        );
      }

      const eligibleJobs = getEligibleJobs(user.level);
      if (eligibleJobs.length === 0) {
        return sock.sendMessage(
          chatId,
          { text: "No hay trabajos disponibles para tu nivel actual." }
        );
      }

      const job =
        eligibleJobs[Math.floor(Math.random() * eligibleJobs.length)];
      const earnings = job.salary;
      const xpGained = Math.floor(earnings / 10);
      const stressGained = 10; // Aumento de estrés fijo por trabajar

      const userLevel = user.level;
      const range = cooldownRanges[userLevel] || { min: 1, max: 2 };
      const randomCooldownMinutes =
        Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;

      user.economy.wallet += earnings;
      user.xp += xpGained;
      user.status.stress = Math.min(
        100,
        (user.status.stress || 0) + stressGained
      );
      await updateHealth(user); // Actualizar salud después de cambiar el estrés
      user.cooldowns.work = new Date(
        new Date().getTime() + randomCooldownMinutes * 60 * 1000
      );
      user.lastInteraction = new Date();
      await user.save();

      let workResponse = `
*💼 ¡BUEN TRABAJO! 💼*
🔨════════════ 🔨

👤 @${senderJid.split("@")[0]}
🧹 *Puesto:* _${job.name}_
> 🤫 *Detalle:* _${job.description}_
💰 *Salario:* \`${currency} ${earnings.toLocaleString()}\`
🌟 *XP:* \`+${xpGained}\`
😵 *Estrés:* \`+${stressGained}%\` (Total: ${user.status.stress}%)`;

      await sock.sendMessage(chatId, { text: workResponse, mentions: [senderJid] });

      // --- Nueva funcionalidad: Mensaje de advertencia al llegar al 100% de estrés ---
      if (user.status.stress >= 100) {
        const stressWarning = `
⚠️ *¡ALERTA DE ESTRÉS!* ⚠️
══════════════════

@${senderJid.split("@")[0]}, has alcanzado el 100% de estrés. ¡Es hora de un descanso!

No podrás volver a trabajar hasta que tu nivel de estrés baje.

*Recomendaciones para relajarte:*
- Pisco Sour
- Cerveza Heladita

Usa \`.shop\` para ver la tienda y \`.buy\` para comprar algo que te ayude a relajarte.
        `;
        // Enviamos el mensaje de advertencia después de la respuesta del trabajo
        await sock.sendMessage(chatId, { text: stressWarning, mentions: [senderJid] });
      }

    } catch (error) {
      console.error("Error en el comando work:", error);
      sock.sendMessage(
        chatId,
        { text: "Ocurrió un error al procesar el comando de trabajo." }
      );
    }
  },
};
