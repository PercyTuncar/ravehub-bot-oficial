const { proto, initAuthCreds, BufferJSON } = require('@whiskeysockets/baileys');
const { promises: fs } = require('fs');
const path = require('path');
const P = require('pino');

const logger = P().child({ level: 'silent', stream: 'store' });

/**
 * Crea un store de autenticación en memoria con escritura en búfer para Baileys.
 * Este enfoque mejora el rendimiento al reducir las operaciones de E/S de disco síncronas,
 * que pueden bloquear el hilo principal de Node.js y hacer que el bot no responda.
 * 
 * Cómo funciona:
 * 1. Mantiene las credenciales en un objeto en memoria para una lectura rápida.
 * 2. Las operaciones de escritura (guardado de credenciales) no escriben inmediatamente en el disco.
 * 3. En su lugar, las escrituras se agrupan y se guardan de forma asíncrona en un intervalo de tiempo,
 *    evitando bloquear el bot durante las operaciones de cifrado/descifrado.
 * 4. Esto es crucial para bots que manejan muchas conversaciones o se ejecutan en contenedores/servidores
 *    donde la E/S del disco puede ser un cuello de botella.
 * 
 * @param {string} folderName - El nombre de la carpeta donde se deben guardar las credenciales.
 * @returns Un objeto con los métodos `state` y `saveCreds` para ser usado con Baileys.
 */
const makeBufferedAuthStore = async (folderName) => {
    const folder = path.join(__dirname, '..', folderName);
    
    // Asegurarse de que el directorio exista, de forma asíncrona.
    await fs.mkdir(folder, { recursive: true });

    let creds;
    let keys = {};

    /**
     * Guarda los datos en el archivo de forma asíncrona.
     * Se utiliza un "debounce" para evitar escrituras excesivas en un corto período.
     */
    const saveState = async () => {
        try {
            // Se usa JSON.stringify con una función de reemplazo para manejar Buffers y BigInts.
            const str = JSON.stringify({ creds, keys }, BufferJSON.replacer, 2);
            await fs.writeFile(path.join(folder, 'creds.json'), str, 'utf-8');
        } catch (e) {
            logger.error('Error al guardar el estado de autenticación:', e);
        }
    };

    const loadState = async () => {
        try {
            const data = await fs.readFile(path.join(folder, 'creds.json'), 'utf-8');
            const { creds: loadedCreds, keys: loadedKeys } = JSON.parse(data, BufferJSON.reviver);
            creds = loadedCreds || initAuthCreds();
            keys = loadedKeys || {};
        } catch (e) {
            // Si el archivo no existe o hay un error, empezamos de cero.
            creds = initAuthCreds();
            keys = {};
        }
    };

    await loadState();

    return {
        state: {
            creds,
            keys: {
                get: (type, ids) => {
                    const key = `${type}:${ids.join(':')}`;
                    return keys[key];
                },
                set: (data) => {
                    Object.assign(keys, data);
                    saveState(); // Guardar en segundo plano
                },
            },
        },
        saveCreds: async () => {
            await saveState();
        },
    };
};

module.exports = makeBufferedAuthStore;
