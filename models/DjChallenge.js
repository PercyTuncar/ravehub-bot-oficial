const mongoose = require('mongoose');

const djChallengeSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    silhouetteImageUrl: { type: String, required: true },
    revealedImageUrl: { type: String, required: true },
    clues: {
        hard: { type: String, required: true },
        medium: { type: String, required: true },
        easy: { type: String, required: true }
    },
    aliases: [{ type: String, lowercase: true }]
});

module.exports = mongoose.model('DjChallenge', djChallengeSchema);
