require('dotenv').config();
const mongoose = require('mongoose');
const ShopItem = require('./models/ShopItem'); // Asegúrate de que la ruta al modelo es correcta

// Nueva lista de productos
const products = [
  // 🛏️ Bienes Raíces
  {
    name: "Casa en San Isidro",
    description: "Casa de 3 pisos en Córpac, zona exclusiva de Lima.",
    price: 500000,
    emoji: "🏡",
  },
  {
    name: "Casa en SJL",
    description: "Casa de esteras en SJL",
    price: 10000,
    emoji: "🏠",
  },

  // 🚗 Vehículos
  {
    name: "Auto Tesla Model 3",
    description: "Auto eléctrico Tesla, autonomía avanzada y diseño futurista.",
    price: 129000,
    emoji: "⚡",
  },
  {
    name: "Chevrolet (Sapito)",
    description: "Compacto y con mucho estilo.",
    price: 8000,
    emoji: "🚗",
  },
  {
    name: "Mototaxi",
    description: "Transporte urbano económico.",
    price: 4500,
    emoji: "🛺",
  },

  // 📱 Tecnología
  {
    name: "iPhone 16 Pro",
    description: "Apple Intelligence, diseño titanio, triple cámara.",
    price: 5149,
    emoji: "📱",
  },
  {
    name: "iPhone 16 Pro Max",
    description: "Pantalla más grande, batería superior, cámara pro.",
    price: 5999,
    emoji: "📱",
  },

  // 🎁 Productos graciosos y para regalar
  {
    name: "Ramo de rosas",
    description: "Para esa persona especial 🌹✨",
    price: 200,
    emoji: "🌹",
  },
  {
    name: "Peluche rave-bebé",
    description: "Un tierno compañero de festival 🧸",
    price: 350,
    emoji: "🧸",
  },
  {
    name: "Cerveza fría",
    description: "Ideal para refrescarse en el post-rave 🥵🍺",
    price: 100,
    emoji: "🍺",
  },
  {
    name: "Carta de amor rave",
    description: "Una declaración de amor con mucho glitter ✨",
    price: 150,
    emoji: "💌",
  },

  // 🎫 Tickets de eventos
  {
    name: "Pase VIP Far Away Peru",
    description: "Acceso VIP al evento Far Away en Perú.",
    price: 150,
    emoji: "🎟️",
  },
  {
    name: "Pase VIP Ultra Perú 2026",
    description: "Acceso VIP a Ultra Perú 2026.",
    price: 350,
    emoji: "🎟️",
  },
  {
    name: "Ticket GA Ultra Perú 2026",
    description: "Entrada general para Ultra Perú (1 día).",
    price: 190,
    emoji: "🎟️",
  },
  {
    name: "Ticket David Guetta Lima",
    description: "Ticket para el show de David Guetta en Lima.",
    price: 287,
    emoji: "🎫",
  },
  {
    name: "Entrada Boris Brejcha General",
    description: "Acceso general para Boris Brejcha.",
    price: 130,
    emoji: "🎫",
  },
  {
    name: "Entrada Boris Brejcha VIP",
    description: "Acceso VIP para Boris Brejcha.",
    price: 200,
    emoji: "🎫",
  },
  {
    name: "Entrada Boris Brejcha Palco",
    description: "Palco VIP para Boris.",
    price: 300,
    emoji: "🎫",
  },
  {
    name: "Ticket DLDK Perú 2025",
    description: "Pre-registro para el evento DLDK en Perú.",
    price: 120,
    emoji: "🎟️",
  },

  // 🎉 Temáticos de festivales de música electrónica
  {
    name: "Camisa con logo de RaveHub",
    description: "Muestra tu orgullo por la comunidad 🔥💖",
    price: 1000,
    emoji: "👕",
  },
  {
    name: "Glitter mágico",
    description: "Brilla toda la noche en la pista de baile ✨",
    price: 300,
    emoji: "✨",
  },
  {
    name: "Perrito rave",
    description: 'Tu compañero de baile  🐶🎵',
    price: 1000,
    emoji: "🐶",
  },
];

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('Conectado a MongoDB...');

        // Limpiar la colección de productos existentes
        await ShopItem.deleteMany({});
        console.log('Productos antiguos eliminados.');

        // Mapear los nuevos productos al modelo, asumiendo stock infinito
        const itemsToInsert = products.map(product => ({
            ...product,
            stock: -1, // Stock infinito
            // No se especifica groupId, serán items globales
        }));

        // Insertar los nuevos productos
        await ShopItem.insertMany(itemsToInsert);
        console.log('¡La tienda ha sido actualizada con los nuevos productos!');

    } catch (error) {
        console.error('Error actualizando la tienda:', error);
    } finally {
        // Cerrar la conexión a la base de datos
        await mongoose.connection.close();
        console.log('Conexión a MongoDB cerrada.');
    }
};

// Ejecutar el script
seedDB();
