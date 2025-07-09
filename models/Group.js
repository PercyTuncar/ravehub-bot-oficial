const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    isRpActive: { type: Boolean, default: false },
    groupName: { type: String, required: false }
}, {
    timestamps: true
});

module.exports = mongoose.model('Group', groupSchema);