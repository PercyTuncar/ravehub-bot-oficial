const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  jid: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  economy: {
    wallet: { type: Number, default: 100 },
    bank: { type: Number, default: 0 },
  },
  inventory: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopItem' },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
  }],
  warnings: { type: Number, default: 0 },
  lastWork: { type: Date, default: null },
  isBanned: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  lastRob: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

const User = mongoose.model('User', userSchema);

module.exports = User;
