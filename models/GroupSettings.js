const mongoose = require('mongoose');

const groupSettingsSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    currencySymbol: { type: String, default: '💵' },
    antiLinkEnabled: { type: Boolean, required: true, default: true },
    warnings: { type: Map, of: Number, required: true, default: {} }
});

module.exports = mongoose.model('GroupSettings', groupSettingsSchema);
