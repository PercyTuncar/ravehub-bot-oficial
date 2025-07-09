require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const ShopItem = require('./models/ShopItem');

const MONGODB_URI = process.env.MONGODB_URI;

const consolidateInventory = async () => {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Conectado a MongoDB...');

        const correctItemName = '1/4 de Pollo a la Brasa';
        const oldItemNames = ['1/4 Pollo a la Brasa', '1/4 de Pollo a la Brasa'];

        const correctShopItem = await ShopItem.findOne({ name: correctItemName });
        if (!correctShopItem) {
            throw new Error(`No se encontró el item de tienda "${correctItemName}".`);
        }

        const users = await User.find({});
        console.log(`Procesando ${users.length} usuarios...`);

        for (const user of users) {
            const polloItems = user.inventory.filter(item => oldItemNames.includes(item.name));

            if (polloItems.length > 1) {
                console.log(`Consolidando inventario para el usuario: ${user.jid}`);
                
                const totalQuantity = polloItems.reduce((sum, item) => sum + item.quantity, 0);
                console.log(`- Cantidad total de pollos encontrada: ${totalQuantity}`);

                // Filtrar para remover todos los items de pollo
                const otherItems = user.inventory.filter(item => !oldItemNames.includes(item.name));

                // Añadir el item consolidado
                otherItems.push({
                    itemId: correctShopItem._id,
                    name: correctShopItem.name,
                    quantity: totalQuantity,
                });

                user.inventory = otherItems;
                await user.save();
                console.log(`- Inventario consolidado para ${user.jid}`);
            } else if (polloItems.length === 1 && polloItems[0].name !== correctItemName) {
                // Corregir el nombre del item si solo hay uno pero es el incorrecto
                console.log(`Corrigiendo nombre de item para el usuario: ${user.jid}`);
                polloItems[0].name = correctItemName;
                polloItems[0].itemId = correctShopItem._id;
                await user.save();
                console.log(`- Nombre de item corregido para ${user.jid}`);
            }
        }

        console.log('¡Migración de inventario completada!');

    } catch (error) {
        console.error('Error durante la migración:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Conexión a MongoDB cerrada.');
    }
};

consolidateInventory();
