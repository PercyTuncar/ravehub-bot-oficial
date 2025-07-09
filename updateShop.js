require('dotenv').config();
const mongoose = require('mongoose');
const ShopItem = require('./models/ShopItem'); // Asegúrate de que la ruta al modelo es correcta

// Nueva lista de productos
const products = [
  // 🛏️ Bienes Raíces
  {
    name: "Casa en San Isidro",
    description: "Zona exclusiva de Lima.",
    price: 500000,
    emoji: "🏡",
    category: "Bienes Raíces",
  },
  {
    name: "Casa en SJL",
    description: "Casa de esteras en SJL",
    price: 10000,
    emoji: "🏠",
    category: "Bienes Raíces",
  },

  // 🚗 Vehículos
  {
    name: "Auto Tesla Model 3",
    description: "Eléctrico, rápido y ecológico.",
    price: 129000,
    emoji: "⚡",
    category: "Vehículos",
  },
  {
    name: "Chevrolet (Sapito)",
    description: "Compacto y con mucho estilo.",
    price: 8000,
    emoji: "🚗",
    category: "Vehículos",
  },
  {
    name: "Mototaxi",
    description: "Transporte urbano económico.",
    price: 4500,
    emoji: "🛺",
    category: "Vehículos",
  },
  {
    name: "Bicicleta",
    description: "Perfecta para la ciudad.",
    price: 800,
    emoji: "🚲",
    category: "Vehículos",
  },

  // 📱 Tecnología
  {
    name: "iPhone 16 Pro",
    description: "Apple Intelligence.",
    price: 5149,
    emoji: "📱",
    category: "Tecnología",
  },
  {
    name: "iPhone 16 Pro Max",
    description: "Batería superior, cámara pro.",
    price: 5999,
    emoji: "📱",
    category: "Tecnología",
  },

  // 🎁 Productos graciosos y para regalar
  {
    name: "Ramo de rosas",
    description: "Para la persona especial 🌹✨",
    price: 200,
    emoji: "🌹",
    category: "Regalos y Sorpresas",
  },
  {
    name: "Peluche rave-bebé",
    description: "Un tierno compañero de festival 🧸",
    price: 350,
    emoji: "🧸",
    category: "Regalos y Sorpresas",
  },
  {
    name: "Cerveza Heladita",
    description: "Ideal para refrescarse 🥵🍺",
    price: 100,
    emoji: "🍺",
    category: "Comida y Bebidas",
    type: "drink",
    aliases: ["cerveza", "chela", "pilsen", "cristal"],
    effects: { hunger: 5, thirst: 25, stress: -10 },
  },
  {
    name: "Carta de amor rave",
    description: "Una declaración de amor 💖",
    price: 150,
    emoji: "💌",
    category: "Regalos y Sorpresas",
  },
  {
    name: "1/4 de Pollo a la Brasa",
    description: "Un clásico peruano para el bajón.",
    price: 25,
    emoji: "🍗",
    category: "Comida y Bebidas",
    type: "food",
    aliases: ["pollo", "1/4 de pollo", "pollo a la brasa", "1/4 de pollo a la brasa"],
    effects: { hunger: 35, thirst: 0, stress: -5 },
  },

  // 🎫 Tickets de eventos
  {
    name: "Pase VIP Far Away Peru",
    description: "Acceso VIP al evento Far Away en Perú.",
    price: 150,
    emoji: "🎟️",
    category: "Tickets de Eventos",
  },
  {
    name: "Pase VIP Ultra Perú 2026",
    description: "Acceso VIP a Ultra Perú 2026.",
    price: 350,
    emoji: "🎟️",
    category: "Tickets de Eventos",
  },
  {
    name: "Ticket GA Ultra Perú 2026",
    description: "Entrada general para Ultra Perú (1 día).",
    price: 190,
    emoji: "🎟️",
    category: "Tickets de Eventos",
  },
  {
    name: "Ticket David Guetta Lima",
    description: "Ticket para el show de David Guetta en Lima.",
    price: 287,
    emoji: "🎫",
    category: "Tickets de Eventos",
  },
  {
    name: "Entrada Boris Brejcha General",
    description: "Acceso general para Boris Brejcha.",
    price: 130,
    emoji: "🎫",
    category: "Tickets de Eventos",
  },
  {
    name: "Entrada Boris Brejcha VIP",
    description: "Acceso VIP para Boris Brejcha.",
    price: 200,
    emoji: "🎫",
    category: "Tickets de Eventos",
  },
  {
    name: "Entrada Boris Brejcha Palco",
    description: "Palco VIP para Boris.",
    price: 300,
    emoji: "🎫",
    category: "Tickets de Eventos",
  },
  {
    name: "Ticket DLDK Perú 2025",
    description: "Pre-registro para el evento DLDK en Perú.",
    price: 120,
    emoji: "🎟️",
    category: "Tickets de Eventos",
  },

  // 🎉 Temáticos de festivales de música electrónica
  {
    name: "Camisa con logo de RaveHub",
    description: "Muestra tu orgullo por la comunidad 🔥💖",
    price: 1000,
    emoji: "👕",
    category: "Artículos de Festival",
  },
  {
    name: "Glitter mágico",
    description: "Brilla toda la noche en la pista de baile ✨",
    price: 300,
    emoji: "✨",
    category: "Artículos de Festival",
  },
  {
    name: "Perrito rave",
    description: 'Tu compañero de baile  🐶🎵',
    price: 1000,
    emoji: "🐶",
    category: "Artículos de Festival",
  },

  // 🍔 Comida y Bebidas
  {
    name: "Arroz Chaufa",
    description: "Clásico arroz chaufa para el bajón.",
    price: 140,
    emoji: "🍚",
    category: "Comida y Bebidas",
    aliases: ["chaufa"],
  },
  {
    name: "Ají de Gallina",
    description: "Cremoso y delicioso ají de gallina.",
    price: 150,
    emoji: "🍛",
    category: "Comida y Bebidas",
    aliases: ["aji de gallina"],
  },
  {
    name: "Caldo de Gallina",
    description: "El levanta muertos por excelencia.",
    price: 150,
    emoji: "🍜",
    category: "Comida y Bebidas",
    aliases: ["caldo"],
  },
  {
    name: "Ceviche",
    description: "Fresco y picante, como debe ser.",
    price: 160,
    emoji: "🐟",
    category: "Comida y Bebidas",
    aliases: ["ceviche"],
  },
  {
    name: "Lomo Saltado",
    description: "Un clásico que nunca falla.",
    price: 160,
    emoji: "🥩",
    category: "Comida y Bebidas",
    aliases: ["lomo"],
  },
  {
    name: "1/4 de Pollo a la Brasa",
    description: "Jugoso y con todas sus cremas.",
    price: 160,
    emoji: "🍗",
    category: "Comida y Bebidas",
    aliases: ["pollo", "pollito", "1/4 pollo a la brasa", "pollo a la brasa"],
  },
  {
    name: "Inca Kola",
    description: "La bebida de sabor nacional.",
    price: 120,
    emoji: "🟡",
    category: "Comida y Bebidas",
    aliases: ["inca"],
  },
  {
    name: "Chicha Morada",
    description: "Refrescante y tradicional.",
    price: 120,
    emoji: "🥤",
    category: "Comida y Bebidas",
    aliases: ["chicha"],
  },
  {
    name: "Emoliente",
    description: "Calientito para el frío.",
    price: 120,
    emoji: "🍵",
    category: "Comida y Bebidas",
    aliases: ["emoliente"],
  },
  {
    name: "Chicha de Jora",
    description: "La bebida de los Incas.",
    price: 120,
    emoji: "🍺",
    category: "Comida y Bebidas",
    aliases: ["jora"],
  },
  {
    name: "Pisco Sour",
    description: "El cóctel bandera del Perú.",
    price: 200,
    emoji: "🍸",
    category: "Comida y Bebidas",
    aliases: ["pisco"],
  },
];

const updateShop = async () => {
  // Conexión a la base de datos
  const dbURI = process.env.MONGODB_URI;

  try {
    await mongoose.connect(dbURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Conectado a MongoDB...');

    // Itera sobre la lista de productos y actualiza o crea
    for (const productData of products) {
      await ShopItem.findOneAndUpdate(
        { name: productData.name }, // Busca por nombre para evitar duplicados
        productData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    console.log('La tienda ha sido actualizada con éxito.');

  } catch (error) {
    console.error('Error al actualizar la tienda:', error);
  } finally {
    // Cerrar la conexión a la base de datos
    await mongoose.connection.close();
    console.log('Conexión a MongoDB cerrada.');
  }
};

// Ejecutar el script
updateShop();
