const connectDB = require('./config/database');
const ShopItem = require('./models/ShopItem');

const itemsToUpdate = [
    {
        name: 'Cerveza Heladita',
        effects: {
            thirst: 15,
            stress: 15,
            health: -1
        }
    },
    {
        name: 'Pisco',
        effects: {
            thirst: 10,
            stress: 10,
            health: -1
        }
    },
    {
        name: 'Pan',
        effects: {
            hunger: 10,
            stress: 1,
            health: 1
        }
    },
    {
        name: 'Pizza',
        effects: {
            hunger: 25,
            stress: 5,
            health: 2
        }
    }
];

const updateItems = async () => {
    try {
        await connectDB();
        console.log('Conectado a la base de datos.');

        for (const itemData of itemsToUpdate) {
            const { name, effects } = itemData;
            const result = await ShopItem.updateOne(
                { name: name },
                { $set: { effects: effects } }
            );

            if (result.matchedCount > 0) {
                console.log(`✅ Efectos del item "${name}" actualizados correctamente.`);
            } else {
                console.log(`⚠️ No se encontró el item "${name}". No se realizaron cambios.`);
            }
        }

    } catch (error) {
        console.error('Error al actualizar los items:', error);
    } finally {
        process.exit();
    }
};

updateItems();
