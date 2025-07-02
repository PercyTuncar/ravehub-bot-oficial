const { proto, initAuthCreds } = require('@whiskeysockets/baileys');

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
 * @param {object} fs - El módulo 'fs' de Node.js para interactuar con el sistema de archivos.
 * @param {string} path - La ruta al archivo donde se deben guardar las credenciales (ej. 'sessions/auth_info.json').
 * @returns Un objeto con los métodos `state` y `saveCreds` para ser usado con Baileys.
 */
const makeBufferedAuthStore = (fs, path) => {
    let creds = null;
    let keys = {};
    let saveCount = 0;

    // Cargar las credenciales iniciales desde el disco si existen.
    try {
        const data = fs.readFileSync(path, { encoding: 'utf-8' });
        const parsed = JSON.parse(data);
        creds = parsed.creds;
        keys = parsed.keys;
    } catch (e) {
        // Si el archivo no existe o hay un error, se inician credenciales nuevas.
        creds = initAuthCreds();
        keys = {};
    }

    /**
     * Guarda los datos en el archivo de forma asíncrona.
     * Se utiliza un "debounce" para evitar escrituras excesivas en un corto período.
     */
    const saveState = async () => {
        try {
            // Se usa JSON.stringify con una función de reemplazo para manejar Buffers y BigInts.
            const data = JSON.stringify({ creds, keys }, (key, value) => {
                if (value instanceof Buffer) {
                    return value.toString('base64');
                }
                if (typeof value === 'bigint') {
                    return value.toString();
                }
                return value;
            }, 2);
            await fs.promises.writeFile(path, data);
        } catch (e) {
            console.error('Error al guardar el estado de autenticación:', e);
        }
    };

    // Un temporizador para agrupar las operaciones de guardado.
    let saveTimeout = null;
    const scheduleSave = () => {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveState, 2000); // Guardar cada 2 segundos de inactividad
    };

    return {
        state: {
            creds,
            keys: {
                get: (type, ids) => {
                    const key = `${type}:${ids.join(':')}`;
                    return keys[key];
                },
                set: (data) => {
                    for (const type in data) {
                        for (const id in data[type]) {
                            const key = `${type}:${id}`;
                            keys[key] = data[type][id];
                        }
                    }
                    scheduleSave();
                },
            },
        },
        saveCreds: () => {
            // La serialización y el guardado se manejan a través de `scheduleSave`.
            // Este método solo necesita asegurarse de que las credenciales más recientes estén en `creds`.
            scheduleSave();
        },
    };
};

module.exports = makeBufferedAuthStore;
