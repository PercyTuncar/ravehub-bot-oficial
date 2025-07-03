let sock = null;

function setSocket(socket) {
    sock = socket;
}

function getSocket() {
    return sock;
}

module.exports = {
    setSocket,
    getSocket,
};

// Manejar respuestas de juegos
if (!isCommand) {
  const jid = msg.key.participant || msg.key.remoteJid;
  if (jid) {
    await handleGameResponse(msg, jid, sock);
  }
}

// Resto de los manejadores de eventos...
