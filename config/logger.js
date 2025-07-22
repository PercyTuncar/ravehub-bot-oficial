const pino = require('pino');

// Configuración centralizada del logger para toda la aplicación.
const logger = pino({
    level: process.env.LOG_LEVEL || 'debug', // El nivel de log puede ser configurable.
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            ignore: 'pid,hostname', // Ignorar propiedades innecesarias.
            translateTime: 'SYS:dd-mm-yyyy HH:MM:ss' // Formato de fecha consistente.
        }
    }
});

module.exports = logger;
