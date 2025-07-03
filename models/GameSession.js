const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema({
    jid: { type: String, required: true, unique: true, index: true },
    groupId: { type: String, required: true, index: true },
    gameName: { type: String, required: true },
    betAmount: { type: Number, default: 0 },
    // Guardamos el estado inicial del usuario por si necesitamos datos para el juego
    userState: { type: Object, required: true },
    // El índice expires limpiará automáticamente el documento de la DB 60 segundos
    // después de la hora especificada. Es un seguro, no la lógica principal.
    expiresAt: { type: Date, default: () => new Date(Date.now() + 30*1000), index: { expires: '60s' } }
});

const GameSession = mongoose.model('GameSession', gameSessionSchema);
module.exports = GameSession;
