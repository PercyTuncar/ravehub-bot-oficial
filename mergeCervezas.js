require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const ShopItem = require('./models/ShopItem');
const dbConfig = require('./config/database');

async function mergeCervezas() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Conectado a la base de datos.');

    const users = await User.find({
      'inventory.name': { $in: ['cerveza fría', 'Cerveza fría'] }
    });

    console.log(`Encontrados ${users.length} usuarios con "cerveza fría".`);

    let cervezaHeladitaItem = await ShopItem.findOne({ name: 'Cerveza Heladita' });
    if (!cervezaHeladitaItem) {
        // Si no existe, lo creamos. Asumimos un precio y emoji, puedes ajustarlo.
        cervezaHeladitaItem = new ShopItem({
            name: 'Cerveza Heladita',
            price: 25, // Ajusta el precio si es necesario
            description: 'Una cerveza bien heladita para el calor.',
            emoji: '🍻'
        });
        await cervezaHeladitaItem.save();
        console.log('Item "Cerveza Heladita" no encontrado, se ha creado uno nuevo.');
    }


    for (const user of users) {
      let cervezaFriaQuantity = 0;
      let cervezaHeladita = user.inventory.find(item => item.name.toLowerCase() === 'cerveza heladita');

      // Sumar cantidad de todas las variantes de "cerveza fría" y eliminarlas
      user.inventory = user.inventory.filter(item => {
        if (item.name.toLowerCase() === 'cerveza fría') {
          cervezaFriaQuantity += item.quantity;
          return false; // Eliminar item
        }
        return true;
      });

      if (cervezaFriaQuantity > 0) {
        if (cervezaHeladita) {
          cervezaHeladita.quantity += cervezaFriaQuantity;
        } else {
          user.inventory.push({
            itemId: cervezaHeladitaItem._id,
            name: 'Cerveza Heladita',
            quantity: cervezaFriaQuantity,
          });
        }
        await user.save();
        console.log(`Usuario ${user.name} (${user.jid}) actualizado. ${cervezaFriaQuantity} cervezas frías movidas a heladitas.`);
      }
    }

    console.log('Migración completada.');
  } catch (error) {
    console.error('Error durante la migración:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de la base de datos.');
  }
}

mergeCervezas();
