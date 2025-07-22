const ShopItem = require("../../models/ShopItem");
const { getCurrency } = require("../../utils/groupUtils");
const User = require("../../models/User");

module.exports = {
  name: "shop",
  description: "Muestra los items disponibles en la tienda.",
  aliases: ["tienda"],
  category: "economy",
  async execute(message, args, client) {
    const chatId = message.key.remoteJid;
    const currency = await getCurrency(chatId);

    try {
      const items = await ShopItem.find({});
      if (!items.length) {
        return client.sendMessage(chatId, { text: "La tienda está vacía en este momento." });
      }

      // Agrupar items por categoría
      const itemsByCategory = items.reduce((acc, item) => {
        const category = item.category || 'General';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      }, {});

      // Ordenar categorías
      const categoryOrder = [
        'Comida y Bebidas',
        'Bienes Raíces',
        'Vehículos',
        'Tecnología',
        'Regalos y Sorpresas',
        'Tickets de Eventos',
        'Artículos de Festival',
        'General'
      ];

      const sortedCategories = Object.keys(itemsByCategory).sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

      let shopMessage = `*╭───≽ 🏪 TIENDA RAVEHUB 🏪 ≼───*\n\n`;

      for (const category of sortedCategories) {
        const categoryEmoji = getCategoryEmoji(category);
        shopMessage += `╭─≽ *${categoryEmoji} ${category}*\n`;
        
        // Ordenar items por precio dentro de la categoría
        const sortedItems = itemsByCategory[category].sort((a, b) => a.price - b.price);

        for (const item of sortedItems) {
          shopMessage += `│ ${item.emoji} *${item.name}* - ${currency} ${item.price.toLocaleString()}\n`;
          if (item.description) {
            // Reemplazar saltos de línea en la descripción para evitar romper el diseño
            const description = item.description.replace(/\n/g, ' ');
            shopMessage += `│    └ _${description}_\n`;
          }
        }
        shopMessage += `╰─────────────────≽\n\n`;
      }

      shopMessage += `*╰─ 🛍️ Usa \`.buy <item>\` para comprar ─*`;

      await client.sendMessage(chatId, { text: shopMessage });

    } catch (error) {
      console.error("Error al mostrar la tienda:", error);
      await client.sendMessage(chatId, { text: "Hubo un error al intentar mostrar la tienda." });
    }
  },
};

function getCategoryEmoji(category) {
  switch (category) {
    case 'Comida y Bebidas': return '🍔';
    case 'Bienes Raíces': return '🏡';
    case 'Vehículos': return '🚗';
    case 'Tecnología': return '📱';
    case 'Regalos y Sorpresas': return '🎁';
    case 'Tickets de Eventos': return '🎟️';
    case 'Artículos de Festival': return '🎉';
    default: return '🛍️';
  }
}
