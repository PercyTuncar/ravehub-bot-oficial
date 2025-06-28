const ShopItem = require("../../models/ShopItem");

const shopItems = [
  // Productos graciosos y para regalar
  {
    name: "Ramo de rosas",
    description: "Ideal para sorprender al/la especial 🌹✨",
    price: 200,
    emoji: "🌹",
  },
  {
    name: "Peluche rave-bebé",
    description: "Un peluchito bonito 🧸",
    price: 350,
    emoji: "🧸",
  },
  {
    name: "Cerveza fría",
    description: "Refresca cuerpo y alma después de bailar 🥵🍺",
    price: 100,
    emoji: "🍺",
  },
  {
    name: "Carta de amor rave",
    description: " “Desde que te vi con glitter, supe que eras tú”",
    price: 150,
    emoji: "💌",
  },
  // Tickets de eventos
  {
    name: "Pase VIP Far Away Peru",
    description: "Entrada VIP exclusiva para el evento Far Away en Perú.",
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
    description: "Entrada general 1 día para Ultra Perú (S/ 190).",
    price: 190,
    emoji: "🎟️",
  },
  {
    name: "Ticket David Guetta Lima",
    description: "Reventa aproximada S/ 287 para show 8/oct/2025.",
    price: 287,
    emoji: "🎫",
  },
  {
    name: "Entrada Boris Brejcha General",
    description: "Entrada general para show 12/dic/25 (S/ 130).",
    price: 130,
    emoji: "🎫",
  },
  {
    name: "Entrada Boris Brejcha VIP",
    description: "Acceso VIP para Boris Brejcha (S/ 200).",
    price: 200,
    emoji: "🎫",
  },
  {
    name: "Entrada Boris Brejcha Palco",
    description: "Palco Ultra VIP (S/ 300).",
    price: 300,
    emoji: "🎫",
  },
  {
    name: "Ticket DLDK Perú 2025",
    description: "Registro obligatorio previo al precio oficial.",
    price: 120,
    emoji: "🎟️",
  },
  // Temáticos de festivales de música electrónica

  {
    name: "Camisa con logo de RaveHub",
    description: "Muestra tu orgullo por la comunidad 🔥💖",
    price: 1000,
    emoji: "👕",
  },
  {
    name: "Glitter mágico",
    description: "Con una sola aplicación atraes miradas ✨",
    price: 300,
    emoji: "✨",
  },

  {
    name: "Perrito rave",
    description: 'Baila contigo. No ladra, dice "¡Boom!" 🐶🎵',
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
  description: "Muestra la tienda de items.",
  category: "economy",
  async execute(sock, message) {
    const chatId = message.key.remoteJid;

    try {
      const items = await ShopItem.find().sort({ price: 1 }); // Ordenar por precio
      if (items.length === 0) {
        return sock.sendMessage(chatId, {
          text: "La tienda está vacía en este momento.",
        });
      }

      // Agrupar items por categorías (basado en la lista del archivo)
      const categories = {
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
        "👕 Artículos de Festival": [
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
          categoryItems.forEach((item) => {
            shopMessage += `*│* ${item.emoji} *${item.name}* - $${item.price} 💵\n`;
            shopMessage += `*│*  _${item.description}_\n`;
          });
        } else {
          shopMessage += `*│* (No hay items en esta categoría)\n`;
        }
        shopMessage += `*│* ╰─────────────────≽\n*│*\n`;
      }

      shopMessage += "*╰─ 🛍️ Usa `.buy <item>` para comprar ─*\n";

      await sock.sendMessage(chatId, { text: shopMessage });
    } catch (error) {
      console.error("Error al mostrar la tienda:", error);
      await sock.sendMessage(chatId, {
        text: "Ocurrió un error al intentar mostrar la tienda.",
      });
    }
  },
};
