const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
        });
        console.log('Conectado a MongoDB Atlas');
    } catch (error) {
        console.error('Error al conectar a MongoDB:', error);
        process.exit(1);
    }

    mongoose.connection.on('disconnected', () => {
        console.log('Desconectado de MongoDB');
    });
};

module.exports = connectDB;
