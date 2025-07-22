const bot = {
    sock: null,
    setSocket(socket) {
        this.sock = socket;
    },
    getSocket() {
        return this.sock;
    },
    async disconnect() {
        if (this.sock) {
            console.log('Desconectando el bot y cerrando la sesión de forma segura...');
            await this.sock.logout(); // Cierra la sesión de WhatsApp
            console.log('Sesión cerrada. El bot se ha desconectado.');
        }
    }
};

module.exports = bot;
