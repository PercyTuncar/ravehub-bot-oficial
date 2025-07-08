const mongoose = require('mongoose');

const groupSettingsSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    currencySymbol: { type: String, default: '💵' },
    antiLinkEnabled: { type: Boolean, required: true, default: false },
    warnings: { type: Map, of: Number, required: true, default: {} },
    welcomeMessage: { type: String, default: null },
    welcomeImage: { type: String, default: null }
});

module.exports = mongoose.model('GroupSettings', groupSettingsSchema);
