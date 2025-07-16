let sock = null;

function setSocket(socket) {
    sock = socket;
}

function getSocket() {
    return sock;
}

async function disconnect() {
    if (sock) {
        console.log('Desconectando el bot y cerrando la sesión de forma segura...');
        await sock.logout(); // Cierra la sesión de WhatsApp
        console.log('Sesión cerrada. El bot se ha desconectado.');
    }
}

module.exports = {
    setSocket,
    getSocket,
    disconnect,
};
