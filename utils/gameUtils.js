const GameSession = require('../models/GameSession');
const { getSocket } = require('../bot');
const { addMessageToQueue } = require('./messageQueue');

// Este Map guardará los temporizadores activos, asociando el JID del usuario con su temporizador.
const activeTimers = new Map();

/**
 * Inicia una sesión de juego, la guarda en la DB y crea un temporizador de 30s para la expiración.
 */
async function startGameSession(jid, groupId, gameName, sessionData) {
    const sock = getSocket();

    // 1. Crear y guardar la sesión en la base de datos
    const session = new GameSession({
        jid,
        groupId,
        gameType: gameName, // Corregido para que coincida con el modelo
        data: sessionData,       // Corregido para que coincida con el modelo
    });
    await session.save();

    // 2. Crear el temporizador de expiración
    const timer = setTimeout(async () => {
        try {
            // Verificar si la sesión todavía existe (puede haber sido manejada justo a tiempo)
            const expiredSession = await GameSession.findOneAndDelete({ jid });

            if (expiredSession) {
                console.log(`[GameSession] Sesión de ${jid} expirada.`);
                // Ya no necesitamos buscar al usuario ni modificar su cartera.
                // Simplemente enviamos una notificación correcta.
                addMessageToQueue(sock, groupId, {
                    text: `⌛ @${jid.split('@')[0]}, se agotó el tiempo para tu jugada. La partida ha sido cancelada (tu apuesta no fue descontada).`,
                    mentions: [jid]
                });
            }
        } catch (error) {
            console.error("Error en el temporizador de expiración de sesión:", error);
        } finally {
            // Limpiar el temporizador del Map
            activeTimers.delete(jid);
        }
    }, 30000); // 30 segundos

    // 3. Guardar la referencia al temporizador para poder cancelarlo si el usuario responde
    activeTimers.set(jid, timer);
    console.log(`[GameSession] Sesión de ${gameName} iniciada para ${jid} con temporizador.`);
}

/**
 * Obtiene la sesión de juego activa de un usuario desde la DB.
 */
function getGameSession(jid) {
    return GameSession.findOne({ jid });
}

// NUEVA FUNCIÓN: Detiene solo el temporizador
function stopSessionTimer(jid) {
    const timer = activeTimers.get(jid);
    if (timer) {
        clearTimeout(timer);
        activeTimers.delete(jid);
        console.log(`[GameSession] Temporizador detenido para ${jid}.`);
        return true;
    }
    return false;
}

// MODIFICADO: Ahora solo borra la sesión de la DB
async function endGameSession(jid) {
    await GameSession.deleteOne({ jid });
    console.log(`[GameSession] Sesión finalizada y eliminada de la DB para ${jid}.`);
}

module.exports = {
    startGameSession,
    getGameSession,
    stopSessionTimer, // Exportar la nueva función
    endGameSession,
};
