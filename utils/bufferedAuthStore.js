const { proto, initAuthCreds, BufferJSON } = require('@whiskeysockets/baileys');
const { promises: fs } = require('fs');
const P = require('pino');

const logger = P().child({ level: 'silent', stream: 'store' });

/**
 * Almacena y lee las credenciales de autenticación desde un archivo JSON específico.
 * No maneja la lógica de rutas, solo lee/escribe en el path proporcionado.
 * @param {string} filePath - La ruta completa al archivo de credenciales (ej. /path/to/sessions/creds.json)
 */
const makeFileAuthStore = (filePath) => {
    let creds;
    let keys = {};

    const saveState = async () => {
        try {
            const str = JSON.stringify({ creds, keys }, BufferJSON.replacer, 2);
            await fs.writeFile(filePath, str, 'utf-8');
        } catch (e) {
            logger.error('Error al guardar el estado de autenticación en', filePath, e);
        }
    };

    const loadState = async () => {
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            const { creds: loadedCreds, keys: loadedKeys } = JSON.parse(data, BufferJSON.reviver);
            creds = loadedCreds || initAuthCreds();
            keys = loadedKeys || {};
        } catch (e) {
            creds = initAuthCreds();
            keys = {};
        }
    };

    // Cargar el estado inmediatamente al crear la instancia.
    // Es importante que la función que llama a esto sea async.
    const self = {
        state: {
            creds: null, // Se inicializará después de loadState
            keys: {
                get: (type, ids) => {
                    const key = `${type}:${ids.join(':')}`;
                    return keys[key];
                },
                set: (data) => {
                    // La lógica correcta para guardar las claves.
                    // Object.assign es incorrecto aquí, ya que no aplana la estructura de claves.
                    for (const type in data) {
                        for (const id in data[type]) {
                            const key = `${type}:${id}`;
                            keys[key] = data[type][id];
                        }
                    }
                    saveState();
                },
            },
        },
        saveCreds: saveState,
        clearCreds: () => {
            creds = initAuthCreds();
            keys = {};
            return saveState();
        },
        // Función para inicializar el estado de forma asíncrona.
        init: async () => {
            await loadState();
            self.state.creds = creds;
            return self;
        }
    };

    return self;
};

module.exports = makeFileAuthStore;
