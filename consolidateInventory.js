require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function consolidateInventory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Conectado a la base de datos para consolidar inventarios.');

    const users = await User.find({});
    console.log(`Encontrados ${users.length} usuarios para procesar.`);

    for (const user of users) {
      if (!user.inventory || user.inventory.length === 0) {
        continue;
      }

      const consolidated = new Map();
      let hasChanged = false;

      for (const item of user.inventory) {
        // Usar el nombre en minúsculas como clave para la consolidación
        const key = item.name.toLowerCase();
        
        if (consolidated.has(key)) {
          // Si el item ya existe en el mapa, solo suma la cantidad
          const existingItem = consolidated.get(key);
          existingItem.quantity += item.quantity;
          hasChanged = true; // Marcamos que hubo un cambio
        } else {
          // Si es la primera vez que vemos este item, lo agregamos al mapa
          consolidated.set(key, {
            itemId: item.itemId,
            name: item.name, // Mantenemos el nombre original con mayúsculas/minúsculas
            quantity: item.quantity,
          });
        }
      }

      // Si el inventario después de consolidar tiene menos items que el original,
      // significa que se fusionaron duplicados.
      if (consolidated.size < user.inventory.length) {
        hasChanged = true;
      }

      if (hasChanged) {
        // Reemplazar el inventario viejo con el nuevo consolidado
        user.inventory = Array.from(consolidated.values());
        await user.save();
        console.log(`Inventario del usuario ${user.name} (${user.jid}) consolidado.`);
      }
    }

    console.log('Consolidación de inventarios completada.');
  } catch (error) {
    console.error('Error durante la consolidación de inventarios:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de la base de datos.');
  }
}

consolidateInventory();
