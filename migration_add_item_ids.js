require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const ShopItem = require('./models/ShopItem');

const migrateInventories = async () => {
  const dbURI = process.env.MONGODB_URI;
  if (!dbURI) {
    console.error('Error: La variable de entorno MONGODB_URI no está definida.');
    return;
  }

  try {
    await mongoose.connect(dbURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Conectado a MongoDB para la migración...');

    // 1. Cargar todos los items de la tienda en memoria para búsquedas rápidas
    const shopItems = await ShopItem.find({});
    const shopItemsMap = new Map(shopItems.map(item => [item.name.toLowerCase(), item._id]));

    // 2. Obtener todos los usuarios
    const users = await User.find({});
    let usersModified = 0;

    console.log(`Se encontraron ${users.length} usuarios para procesar.`);

    // 3. Iterar sobre cada usuario
    for (const user of users) {
      let inventoryModified = false;
      
      // 4. Iterar sobre el inventario de cada usuario
      for (const invItem of user.inventory) {
        // 5. Comprobar si falta el itemId pero existe un nombre
        if (!invItem.itemId && invItem.name) {
          const itemNameLower = invItem.name.toLowerCase();
          
          // 6. Buscar el ID correspondiente en el mapa de la tienda
          if (shopItemsMap.has(itemNameLower)) {
            const correctItemId = shopItemsMap.get(itemNameLower);
            invItem.itemId = correctItemId;
            inventoryModified = true;
            console.log(`[Usuario: ${user.name || user.jid}] Item "${invItem.name}" actualizado con itemId: ${correctItemId}`);
          } else {
            console.warn(`[Usuario: ${user.name || user.jid}] No se encontró un item en la tienda para "${invItem.name}". Se omitirá.`);
          }
        }
      }

      // 7. Si el inventario fue modificado, guardar el usuario
      if (inventoryModified) {
        await user.save();
        usersModified++;
      }
    }

    console.log('\n--- Resumen de la Migración ---');
    console.log(`Migración completada.`);
    console.log(`${usersModified} de ${users.length} usuarios tenían inventarios que necesitaban ser actualizados.`);
    console.log('Todos los items de inventario ahora deberían tener un itemId válido.');
    console.log('-----------------------------');

  } catch (error) {
    console.error('Ocurrió un error durante el proceso de migración:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Conexión a MongoDB cerrada.');
  }
};

// Ejecutar el script de migración
migrateInventories();
