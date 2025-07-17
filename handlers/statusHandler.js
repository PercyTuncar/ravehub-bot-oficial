const User = require('../models/User');
const { addMessageToQueue } = require('../utils/messageQueue');
const logger = require('../config/logger');

const STATUS_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutos en milisegundos

/**
 * Utiliza operaciones masivas de MongoDB para actualizar el estado de los usuarios de forma eficiente.
 * Esto es mucho más rápido que leer y escribir cada documento individualmente.
 */
const performBulkUpdates = async () => {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    try {
        // 1. Penalizar a usuarios inactivos con una sola operación
        await User.updateMany(
            { 'status.isDead': false, lastInteraction: { $lt: thirtyMinutesAgo } },
            { $inc: { 'status.hunger': -5, 'status.thirst': -5 } }
        );

        // 2. Poner un límite inferior de 0 para hambre y sed
        await User.updateMany(
            { 'status.isDead': false, $or: [{ 'status.hunger': { $lt: 0 } }, { 'status.thirst': { $lt: 0 } }] },
            [
                { $set: { 'status.hunger': { $max: [0, '$status.hunger'] } } },
                { $set: { 'status.thirst': { $max: [0, '$status.thirst'] } } }
            ]
        );

        // 3. Recalcular la salud de todos los usuarios activos en una sola operación
        await User.updateMany(
            { 'status.isDead': false },
            [{
                $set: {
                    'status.health': {
                        $round: {
                            $divide: [
                                { $add: ['$status.hunger', '$status.thirst', { $subtract: [100, '$status.stress'] }] },
                                3
                            ]
                        }
                    }
                }
            }]
        );
    } catch (error) {
        logger.error(error, 'Error durante las actualizaciones masivas de estado de usuario.');
    }
};

/**
 * Busca usuarios que necesitan notificaciones y las envía.
 * Esto evita cargar a todos los usuarios en memoria.
 */
const checkAndNotifyUsers = async (client) => {
    try {
        // Notificaciones de hambre
        const hungryUsers = await User.find({ 'status.isDead': false, 'status.hunger': { $lt: 10 }, notifiedHunger: { $ne: true } });
        for (const user of hungryUsers) {
            addMessageToQueue(client, user.groupId, {
                text: `⚠️ @${user.jid.split('@')[0]} Tienes mucha hambre, usa \`.comer\` para evitar perder salud.`,
                mentions: [user.jid]
            });
            user.notifiedHunger = true;
            await user.save();
        }
        await User.updateMany({ 'status.hunger': { $gte: 10 }, notifiedHunger: true }, { $set: { notifiedHunger: false } });

        // Notificaciones de sed
        const thirstyUsers = await User.find({ 'status.isDead': false, 'status.thirst': { $lt: 10 }, notifiedThirst: { $ne: true } });
        for (const user of thirstyUsers) {
            addMessageToQueue(client, user.groupId, {
                text: `⚠️ @${user.jid.split('@')[0]} Estás muy deshidratado, usa \`.beber\` para mantenerte vivo.`,
                mentions: [user.jid]
            });
            user.notifiedThirst = true;
            await user.save();
        }
        await User.updateMany({ 'status.thirst': { $gte: 10 }, notifiedThirst: true }, { $set: { notifiedThirst: false } });

        // Notificaciones de estrés
        const stressedUsers = await User.find({ 'status.isDead': false, 'status.stress': { $gt: 80 }, notifiedStress: { $ne: true } });
        for (const user of stressedUsers) {
            addMessageToQueue(client, user.groupId, {
                text: `⚠️ @${user.jid.split('@')[0]} Tu nivel de estrés es muy alto. Considera usar \`.relajarse\` o consumir algo de la tienda.`,
                mentions: [user.jid]
            });
            user.notifiedStress = true;
            await user.save();
        }
        await User.updateMany({ 'status.stress': { $lte: 80 }, notifiedStress: true }, { $set: { notifiedStress: false } });

    } catch (error) {
        logger.error(error, 'Error al comprobar y notificar a los usuarios.');
    }
};

/**
 * Busca usuarios cuya salud ha llegado a 0 y procesa su muerte.
 */
const checkDeaths = async (client) => {
    try {
        const usersToDie = await User.find({ 'status.isDead': false, 'status.health': { $lte: 0 } });
        for (const user of usersToDie) {
            user.status.isDead = true;
            const xpLoss = 550;
            const moneyLossPercentage = 0.40;
            const itemsToRemove = 5;

            const moneyLost = user.economy.wallet * moneyLossPercentage;
            const itemsLostCount = Math.min(user.inventory.length, itemsToRemove);

            addMessageToQueue(client, user.groupId, {
                text: `💀 @${user.jid.split('@')[0]} ¡Has muerto por colapso físico!\nHas perdido:\n- XP: –${xpLoss}\n- Dinero: –${moneyLost.toLocaleString()}\n- Inventario: ${itemsLostCount} ítems al azar\nUsa \`.renacer\` para volver al juego.`,
                mentions: [user.jid]
            });
            
            // Aplicar penalizaciones
            user.xp -= xpLoss;
            user.economy.wallet -= moneyLost;
            user.inventory.splice(0, itemsLostCount); // Eliminar items del inventario

            await user.save();
        }
    } catch (error) {
        logger.error(error, 'Error al procesar la muerte de usuarios.');
    }
};


/**
 * Función principal que orquesta todas las comprobaciones de estado.
 * Se ejecuta en un ciclo controlado por setTimeout para evitar solapamientos.
 */
const runStatusCheckCycle = async (client) => {
    logger.info('Iniciando ciclo de comprobación de estado...');
    try {
        await performBulkUpdates();
        await checkAndNotifyUsers(client);
        await checkDeaths(client);
    } catch (error) {
        logger.error(error, 'Error en el ciclo principal de comprobación de estado.');
    } finally {
        // Programar la siguiente ejecución solo después de que la actual haya terminado.
        setTimeout(() => runStatusCheckCycle(client), STATUS_CHECK_INTERVAL);
        logger.info(`Ciclo de comprobación de estado finalizado. Siguiente ejecución en ${STATUS_CHECK_INTERVAL / 60000} minutos.`);
    }
};

module.exports = {
    startChecking: (client) => {
        // Iniciar el ciclo de forma segura.
        runStatusCheckCycle(client);
    }
};