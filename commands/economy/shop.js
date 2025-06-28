const ShopItem = require('../../models/ShopItem');

// Pre-llenar la tienda si está vacía
(async () => {
    try {
        const count = await ShopItem.countDocuments();
        if (count === 0) {
            await ShopItem.insertMany([
                { name: 'Café', description: 'Te da un impulso de energía.', price: 100, emoji: '☕' },
                { name: 'Pizza', description: 'Una deliciosa pizza para compartir.', price: 300, emoji: '🍕' },
                { name: 'Laptop', description: 'Necesaria para trabajos de programación.', price: 2000, emoji: '💻' },
                { name: 'Caña de pescar', description: 'Para pescar y ganar dinero extra.', price: 500, emoji: '🎣' },
                { name: 'Coche', description: 'Te permite viajar más rápido.', price: 10000, emoji: '🚗' },
            ]);
            console.log('Items iniciales de la tienda creados.');
        }
    } catch (error) {
        console.error('Error al crear items de la tienda:', error);
    }
})();

module.exports = {
    name: 'shop',
    description: 'Muestra la tienda de items.',
    category: 'economy',
    async execute(sock, message) {
        const chatId = message.key.remoteJid;

        try {
            const items = await ShopItem.find();
            if (items.length === 0) {
                return sock.sendMessage(chatId, { text: 'La tienda está vacía en este momento.' });
            }

            let shopMessage = '*🏪 Tienda de RaveHub 🏪*\n\n';
            items.forEach(item => {
                shopMessage += `${item.emoji} *${item.name}* - ${item.price} 🪙\n_${item.description}_\n\n`;
            });
            shopMessage += 'Usa `.buy <item>` para comprar.';

            await sock.sendMessage(chatId, { text: shopMessage });

        } catch (error) {
            console.error('Error al mostrar la tienda:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al intentar mostrar la tienda.' });
        }
    }
};
