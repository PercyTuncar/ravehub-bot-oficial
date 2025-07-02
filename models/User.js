const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  jid: { type: String, required: true, index: true },
  groupId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  cooldowns: {
    work: { type: Date, default: null },
    rob: { type: Date, default: null },
  },
  economy: {
    wallet: { type: Number, default: 0 },
    bank: { type: Number, default: 0 },
    bankCapacity: { type: Number, default: 1000 }
  },
  gameStats: {
    cartaMayor: {
      gamesPlayed: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      ties: { type: Number, default: 0 },
      moneyWon: { type: Number, default: 0 },
      moneyLost: { type: Number, default: 0 }
    }
  },
  debts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Debt' }],
  judicialDebt: { type: Number, default: 0 },
  inventory: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopItem' },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
  }],
  paymentHistory: { 
    paidOnTime: { type: Number, default: 0 },
    paidLate: { type: Number, default: 0 },
  },
  warnings: { type: Number, default: 0 },
  lastWorked: { type: Date, default: null },
  isBanned: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

userSchema.index({ jid: 1, groupId: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
