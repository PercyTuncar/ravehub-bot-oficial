const mongoose = require('mongoose');

const shopItemSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  emoji: { type: String, default: '🛍️' },
  category: { type: String, default: 'General' },
  aliases: [{ type: String }],
});

const ShopItem = mongoose.model('ShopItem', shopItemSchema);

module.exports = ShopItem;
