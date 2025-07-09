const User = require('../models/User');

const checkUserStatus = async (client) => {
    const users = await User.find({ 'status.isDead': false });
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    for (const user of users) {
        // Penalización por inactividad
        if (user.lastInteraction < thirtyMinutesAgo) {
            user.status.hunger = Math.max(0, user.status.hunger - 5);
            user.status.thirst = Math.max(0, user.status.thirst - 5);
        }

        // Calcular salud
        const { hunger, thirst, stress } = user.status;
        user.status.health = Math.round((hunger + thirst + (100 - stress)) / 3);

        // Avisos automáticos
        if (user.status.hunger < 10 && !user.notifiedHunger) {
            client.sendMessage(user.groupId, `⚠️ @${user.jid.split('@')[0]} Tienes mucha hambre, usa \`.comer\` para evitar perder salud.`);
            user.notifiedHunger = true; // Para no spamear
        } else if (user.status.hunger >= 10) {
            user.notifiedHunger = false;
        }

        if (user.status.thirst < 10 && !user.notifiedThirst) {
            client.sendMessage(user.groupId, `⚠️ @${user.jid.split('@')[0]} Estás muy deshidratado, usa \`.beber\` para mantenerte vivo.`);
            user.notifiedThirst = true;
        } else if (user.status.thirst >= 10) {
            user.notifiedThirst = false;
        }

        if (user.status.stress > 80 && !user.notifiedStress) {
            client.sendMessage(user.groupId, `⚠️ @${user.jid.split('@')[0]} Tu nivel de estrés es muy alto. Considera usar \`.relajarse\` o consumir algo de la tienda.`);
            user.notifiedStress = true;
        } else if (user.status.stress <= 80) {
            user.notifiedStress = false;
        }

        // Sistema de muerte
        if (user.status.health <= 0 && !user.status.isDead) {
            user.status.isDead = true;
            const xpLoss = 550;
            const moneyLossPercentage = 0.40;
            const itemsToRemove = 5;

            const moneyLost = user.economy.wallet * moneyLossPercentage;
            const itemsLostCount = Math.min(user.inventory.length, itemsToRemove);

            client.sendMessage(user.groupId, `
💀 @${user.jid.split('@')[0]} ¡Has muerto por colapso físico!
Has perdido:
- XP: –${xpLoss}
- Dinero: –${moneyLost.toLocaleString()}
- Inventario: ${itemsLostCount} ítems al azar
Usa \`.renacer\` para volver al juego.
            `);
        }

        await user.save();
    }
};

module.exports = {
    startChecking: (client) => {
        // Ejecutar cada 30 minutos
        setInterval(() => checkUserStatus(client), 30 * 60 * 1000);
        // Ejecutar una vez al inicio
        checkUserStatus(client);
    }
};
