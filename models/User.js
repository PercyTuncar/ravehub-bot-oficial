const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    jid: { type: String, required: true, unique: true },
    name: { type: String, default: '' },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    groups: [{
        chatId: { type: String, required: true },
        joinedAt: { type: Date, default: Date.now }
    }],
    economy: {
        wallet: { type: Number, default: 1000 },
        bank: { type: Number, default: 0 }
    },
    inventory: [{
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopItem' },
        name: String,
        quantity: Number,
        description: String,
        type: String,
        effects: mongoose.Schema.Types.Mixed,
        purchasedAt: { type: Date, default: Date.now }
    }],
    cooldowns: {
        work: { type: Date, default: null },
        rob: { type: Date, default: null },
        crime: { type: Date, default: null },
        relax: { type: Date, default: null }
    },
    status: {
        health: { type: Number, default: 100 },
        hunger: { type: Number, default: 100 },
        thirst: { type: Number, default: 100 },
        stress: { type: Number, default: 0 },
        isDead: { type: Boolean, default: false }
    },
    loveInfo: {
        relationshipStatus: { type: String, default: 'Soltero/a' },
        partnerJid: { type: String, default: null },
        partnerName: { type: String, default: null },
        relationshipStartDate: { type: Date, default: null },
        marriageCount: { type: Number, default: 0 },
        divorceCount: { type: Number, default: 0 },
        loveHistory: [{
            partnerName: String,
            status: String, // 'married', 'divorced'
            startDate: Date,
            endDate: Date
        }]
    },
    job: {
        name: { type: String, default: 'Desempleado' },
        salary: { type: Number, default: 0 }
    },
    playtime: { type: Number, default: 0 },
    lastInteraction: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

module.exports = User;