const mongoose = require('mongoose');

const shopItemSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  emoji: { type: String, default: '🛍️' },
  category: { type: String, default: 'General' },
  aliases: [{ type: String }],
  type: { type: String, enum: ['food', 'drink', 'special', 'general'], default: 'general' },
  effects: {
    hunger: { type: Number, default: 0 },
    thirst: { type: Number, default: 0 },
    stress: { type: Number, default: 0 },
  }
});

const ShopItem = mongoose.model('ShopItem', shopItemSchema);

module.exports = ShopItem;
