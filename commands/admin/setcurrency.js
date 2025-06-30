require('dotenv').config();
const GroupSettings = require('../../models/GroupSettings');

const countryCurrencies = {
    'argentina': { name: 'Peso argentino', symbol: 'AR$' },
    'bolivia': { name: 'Boliviano', symbol: 'Bs' },
    'brasil': { name: 'Real brasileño', symbol: 'R$' },
    'chile': { name: 'Peso chileno', symbol: '$' },
    'colombia': { name: 'Peso colombiano', symbol: '$' },
    'costa rica': { name: 'Colón costarricense', symbol: '₡' },
    'cuba': { name: 'Peso cubano', symbol: '$' },
    'república dominicana': { name: 'Peso dominicano', symbol: 'RD$' },
    'ecuador': { name: 'Dólar estadounidense', symbol: '$' },
    'el salvador': { name: 'Dólar estadounidense / Bitcoin', symbol: '$' },
    'guatemala': { name: 'Quetzal', symbol: 'Q' },
    'honduras': { name: 'Lempira', symbol: 'L' },
    'méxico': { name: 'Peso mexicano', symbol: '$' },
    'nicaragua': { name: 'Córdoba', symbol: 'C$' },
    'panamá': { name: 'Balboa / Dólar estadounidense', symbol: 'B/.' },
    'paraguay': { name: 'Guaraní', symbol: '₲' },
    'perú': { name: 'Sol peruano', symbol: 's/' },
    'puerto rico': { name: 'Dólar estadounidense', symbol: '$' },
    'uruguay': { name: 'Peso uruguayo', symbol: '$U' },
    'venezuela': { name: 'Bolívar', symbol: 'Bs' },
};

module.exports = {
    name: 'setpais',
    description: 'Establece la moneda para el grupo actual según el país.',
    aliases: ['setcountry'],
    usage: '.setpais <país>',
    category: 'admin',
    async execute(sock, message, args) {
        const senderJid = message.key.fromMe ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : (message.key.participant || message.key.remoteJid);
        const chatId = message.key.remoteJid;

        if (!message.key.remoteJid.endsWith('@g.us')) {
            return sock.sendMessage(chatId, { text: 'Este comando solo se puede usar en grupos.' });
        }

        // --- Permission Check ---
        const isOwner = senderJid.split('@')[0] === process.env.OWNER_NUMBER;
        let isAdmin = false;

        if (!isOwner) {
            try {
                const groupMetadata = await sock.groupMetadata(chatId);
                const senderParticipant = groupMetadata.participants.find(p => p.id === senderJid);
                if (senderParticipant && (senderParticipant.admin === 'admin' || senderParticipant.admin === 'superadmin')) {
                    isAdmin = true;
                }
            } catch (e) {
                console.error("Error al obtener metadatos del grupo:", e);
            }
        }

        if (!isOwner && !isAdmin) {
            return sock.sendMessage(chatId, { text: 'Este comando solo puede ser usado por el propietario del bot o un administrador del grupo.' });
        }

        const countryName = args.join(' ').toLowerCase();
        if (!countryName) {
            const availableCountries = Object.keys(countryCurrencies).map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ');
            return sock.sendMessage(chatId, { text: `Debes proporcionar un país. Países disponibles: ${availableCountries}` });
        }

        const currency = countryCurrencies[countryName];
        if (!currency) {
            const availableCountries = Object.keys(countryCurrencies).map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ');
            return sock.sendMessage(chatId, { text: `País no válido. Países disponibles: ${availableCountries}` });
        }

        try {
            await GroupSettings.findOneAndUpdate(
                { groupId: chatId },
                { currencySymbol: currency.symbol },
                { upsert: true, new: true }
            );

            await sock.sendMessage(chatId, { text: `✅ La moneda del grupo se ha establecido a ${currency.name} (${currency.symbol})` });
        } catch (error) {
            console.error('Error al establecer la moneda:', error);
            await sock.sendMessage(chatId, { text: '❌ Ocurrió un error al configurar la moneda.' });
        }
    },
};
