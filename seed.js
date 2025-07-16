require('dotenv').config();
const mongoose = require('mongoose');
const DjChallenge = require('./models/DjChallenge');
const djsToSeed = require('./djs-to-seed.json');

// Asegúrate de tener tu URI de MongoDB en un archivo .env o reemplaza la cadena
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ravehub-bot';

async function seedDatabase() {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Conexión a MongoDB establecida para la siembra.');

        console.log('Iniciando siembra de datos en la base de datos...');
        let newDjsCount = 0;
        let existingDjsCount = 0;

        for (const djData of djsToSeed) {
            const existingDj = await DjChallenge.findOne({ name: djData.name });

            if (!existingDj) {
                await DjChallenge.create(djData);
                newDjsCount++;
                console.log(`- DJ "${djData.name}" añadido a la base de datos.`);
            } else {
                existingDjsCount++;
            }
        }
        
        if (existingDjsCount > 0) {
            console.log(`\nSe omitieron ${existingDjsCount} DJs que ya existían.`);
        }
        console.log(`\n¡Siembra completada! Se añadieron ${newDjsCount} nuevos DJs.`);

    } catch (error) {
        console.error('Error durante el proceso de siembra:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Conexión a MongoDB cerrada.');
    }
}

seedDatabase();
