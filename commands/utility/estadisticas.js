const GameLog = require('../../models/GameLog');
const moment = require('moment');
const { getSocket } = require('../../bot');

module.exports = {
    name: 'estadisticas',
    description: 'Ver Estadísticas.',
    aliases: ['stats', 'estadísticas'],
    usage: '.estadisticas <nombre del juego>',
    category: 'utility',
    async execute(message, args) {
        const sock = getSocket();
        const jid = message.key.remoteJid;
        const gameName = args.join(' ').toLowerCase().trim();

        if (!gameName) {
            return sock.sendMessage(jid, { text: '❌ Debes especificar el nombre del juego. Ejemplo: *.estadisticas carta mayor*' });
        }

        try {
            const twentyFourHoursAgo = moment().subtract(24, 'hours').toDate();

            const gameLogs = await GameLog.find({
                gameName: gameName,
                groupId: jid,
                timestamp: { $gte: twentyFourHoursAgo }
            }).sort({ timestamp: -1 });

            if (gameLogs.length === 0) {
                return sock.sendMessage(jid, { text: `📈 No se encontraron estadísticas para el juego \"${gameName}\" en las últimas 24 horas.` });
            }

            // 1. Últimas 5 jugadas
            const last5Results = gameLogs.slice(0, 5).map(log => log.result.charAt(0).toUpperCase() + log.result.slice(1)).join(', ') || 'No hay jugadas recientes.';

            // 2. Resumen de todas las jugadas
            const totalPlays = gameLogs.length;
            const resultsCount = {
                izquierda: 0,
                derecha: 0,
                empate: 0
            };

            gameLogs.forEach(log => {
                if (resultsCount.hasOwnProperty(log.result)) {
                    resultsCount[log.result]++;
                }
            });

            const leftPercentage = ((resultsCount.izquierda / totalPlays) * 100).toFixed(1);
            const rightPercentage = ((resultsCount.derecha / totalPlays) * 100).toFixed(1);
            const tiePercentage = ((resultsCount.empate / totalPlays) * 100).toFixed(1);

            // Formatear el mensaje de estadísticas
            const statsMessage = `
*📊 Estadísticas de \"${gameName.toUpperCase()}\" (Últimas 24H)*

*Total de Jugadas:* ${totalPlays}

*Últimos 5 Resultados:*
> ${last5Results}

*Frecuencia de Resultados:*
> • *Izquierda:* ${resultsCount.izquierda} veces (${leftPercentage}%)
> • *Derecha:* ${resultsCount.derecha} veces (${rightPercentage}%)
> • *Empate:* ${resultsCount.empate} veces (${tiePercentage}%)

*Análisis de Tendencia:*
${generateTrendAnalysis(resultsCount)}

_Estas estadísticas se basan en datos históricos y no garantizan resultados futuros._
            `;

            await sock.sendMessage(jid, { text: statsMessage.trim() });

        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            await sock.sendMessage(jid, { text: '⚙️ Ocurrió un error al procesar las estadísticas.' });
        }
    }
};

function generateTrendAnalysis(results) {
    const { izquierda, derecha, empate } = results;
    const total = izquierda + derecha + empate;

    if (total < 10) {
        return 'Se necesitan más jugadas para un análisis de tendencia fiable.';
    }

    const leftRatio = izquierda / (derecha + empate || 1);
    const rightRatio = derecha / (izquierda + empate || 1);

    if (leftRatio > 1.8) return '📈 Se observa una fuerte tendencia hacia la *Izquierda*.';
    if (rightRatio > 1.8) return '📈 Se observa una fuerte tendencia hacia la *Derecha*.';
    if (izquierda > derecha * 1.3) return ' tendencia a la *Izquierda*.';
    if (derecha > izquierda * 1.3) return ' tendencia a la *Derecha*.';

    return '📉 Los resultados parecen estar distribuidos de manera equilibrada.';
}
