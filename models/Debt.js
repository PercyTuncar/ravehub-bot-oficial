const mongoose = require('mongoose');

const debtSchema = new mongoose.Schema({
    borrower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    interest: { type: Number, default: 0.01 }, // 1% daily interest
    createdAt: { type: Date, default: Date.now },
    lastInterestApplied: { type: Date, default: Date.now },
});

const Debt = mongoose.model('Debt', debtSchema);

module.exports = Debt;
