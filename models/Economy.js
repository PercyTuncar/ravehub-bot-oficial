
const mongoose = require('mongoose');

const economySchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, ref: 'User' },
    wallet: { type: Number, required: true, default: 100 },
    bank: { type: Number, required: true, default: 0 },
    bankCapacity: { type: Number, required: true, default: 1000 },
    lastWork: { type: Date, default: null },
    lastRob: { type: Date, default: null },
    inventory: { type: Array, default: [] }
});

module.exports = mongoose.model('Economy', economySchema);
