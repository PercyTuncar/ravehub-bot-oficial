const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  salary: { type: Number, required: true },
  cooldown: { type: Number, required: true }, // Cooldown in minutes
});

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
