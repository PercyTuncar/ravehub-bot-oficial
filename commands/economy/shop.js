const ShopItem = require("../../models/ShopItem");
const { getCurrency } = require("../../utils/groupUtils");
const User = require("../../models/User");
const { getSocket } = require('../../bot');

const shopItems = [
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
    price: 8000,
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
    description: "Tu compañero de baile 🐶🎵",
    price: 1000,
    emoji: "🐶",
  },
];

// Sincronizar items de la tienda con la base de datos al iniciar
(async () => {
  try {
    const itemNamesFromFile = shopItems.map((i) => i.name);

    // 1. Eliminar items de la DB que no están en la lista del archivo
    await ShopItem.deleteMany({ name: { $nin: itemNamesFromFile } });

    // 2. Actualizar o insertar los items de la lista del archivo en la DB
    for (const itemData of shopItems) {
      await ShopItem.findOneAndUpdate({ name: itemData.name }, itemData, {
        upsert: true,
      });
    }

    console.log("✅ La tienda ha sido sincronizada con la base de datos.");
  } catch (error) {
    console.error("Error al sincronizar los items de la tienda:", error);
  }
})();

module.exports = {
  name: "shop",
  description: "Ver tienda de ítems.",
  aliases: ["tienda"],
  usage: ".shop",
  category: "economy",
  async execute(message) {
    const sock = getSocket();
    const chatId = message.key.remoteJid;
    const currency = await getCurrency(chatId);

    try {
      const items = await ShopItem.find().sort({ price: 1 }); // Ordenar por precio
      if (items.length === 0) {
        return sock.sendMessage(chatId, {
          text: "La tienda está vacía en este momento.",
        });
      }

      // Agrupar items por categorías (basado en la lista del archivo)
      const categories = {
        "🏡 Bienes Raíces": [
          "Casa en San Isidro",
          "Casa en SJL",
        ],
        "🚗 Vehículos": [
          "Auto Tesla Model 3",
          "Chevrolet (Sapito)",
          "Mototaxi",
        ],
        "📱 Tecnología": [
          "iPhone 16 Pro",
          "iPhone 16 Pro Max",
        ],
        "🎁 Regalos y Sorpresas": [
          "Ramo de rosas",
          "Peluche rave-bebé",
          "Cerveza fría",
          "Carta de amor rave",
        ],
        "🎟️ Tickets de Eventos": [
          "Pase VIP Far Away Peru",
          "Pase VIP Ultra Perú 2026",
          "Ticket GA Ultra Perú 2026",
          "Ticket David Guetta Lima",
          "Entrada Boris Brejcha General",
          "Entrada Boris Brejcha VIP",
          "Entrada Boris Brejcha Palco",
          "Ticket DLDK Perú 2025",
        ],
        "🎉 Artículos de Festival": [
          "Camisa con logo de RaveHub",
          "Glitter mágico",
          "Perrito rave",
        ],
      };

      let shopMessage = "*╭───≽ 🏪 TIENDA RAVEHUB 🏪 ≼───*\n*│*\n";

      for (const category in categories) {
        shopMessage += `*│* ╭─≽ *${category}*\n`;
        const categoryItems = items.filter((item) =>
          categories[category].includes(item.name)
        );

        if (categoryItems.length > 0) {
          categoryItems.forEach((item, index) => {
            shopMessage += `*│* ${item.emoji} *${item.name}* - ${currency} ${item.price.toLocaleString()}\n`;
            shopMessage += `*│*  _${item.description}_\n`;
            if (index < categoryItems.length - 1) {
              shopMessage += `*│*\n`; // Agrega un salto de línea entre productos
            }
          });
        } else {
          shopMessage += `*│* (No hay items en esta categoría)\n`;
        }
        shopMessage += `*│* ╰─────────────────≽\n*│*\n`;
      }

      shopMessage += "*╰─ 🛍️ Usa `.buy <item>` para comprar ─*\n";

      // Filtrar usuarios por groupId si muestra historial o inventario
      const users = await User.find({ groupId: chatId, jid: { $exists: true, $type: 'string' } });

      await sock.sendMessage(chatId, { text: shopMessage });
    } catch (error) {
      console.error("Error al mostrar la tienda:", error);
      await sock.sendMessage(chatId, {
        text: "Ocurrió un error al intentar mostrar la tienda.",
      });
    }
  },
};
