
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true, default: 'Nuevo Usuario' },
    registeredAt: { type: Date, required: true, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
