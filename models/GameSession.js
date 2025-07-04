const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema({
    jid: { type: String, required: true, unique: true, index: true },
    groupId: { type: String, required: true, index: true },
    gameType: { type: String, required: true }, // Renombrado para consistencia
    data: { type: Object, required: true },      // Contenedor genérico para datos de sesión
    expiresAt: { type: Date, default: () => new Date(Date.now() + 30*1000), index: { expires: '60s' } }
});

const GameSession = mongoose.model('GameSession', gameSessionSchema);
module.exports = GameSession;
