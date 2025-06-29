const mongoose = require('mongoose');

const gameLogSchema = new mongoose.Schema({
    gameName: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    result: {
        type: String,
        required: true
    },
    jid: {
        type: String,
        required: true
    },
    betAmount: {
        type: Number,
        required: true
    },
    winnings: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

gameLogSchema.index({ gameName: 1, timestamp: -1 });

const GameLog = mongoose.model('GameLog', gameLogSchema);

module.exports = GameLog;
