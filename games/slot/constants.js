const SYMBOLS = [
    { emoji: '🍒', name: 'Cereza', weight: 3000, payouts: { 3: 3, 2: 1.5 } },
    { emoji: '🍋', name: 'Limón', weight: 3000, payouts: { 3: 4, 2: 2 } },
    { emoji: '🍊', name: 'Naranja', weight: 2000, payouts: { 3: 5, 2: 2.5 } },
    { emoji: '🍇', name: 'Uva', weight: 1000, payouts: { 3: 8, 2: 3 } },
    { emoji: '🍉', name: 'Sandía', weight: 600, payouts: { 3: 12, 2: 4 } },
    { emoji: '🍎', name: 'Manzana', weight: 300, payouts: { 3: 18, 2: 5 } },
    { emoji: '💎', name: 'Diamante', weight: 80, payouts: { 3: 25, 2: 8 } },
    { emoji: '👑', name: 'Corona', weight: 15, payouts: { 3: 50, 2: 15 } },
    { emoji: '🎰', name: 'Jackpot', weight: 5, payouts: { 3: 100, 2: 25 } },
];

const MIN_BET = 10;
const MAX_BET = 5000;

const SLOT_IMAGE_URL = 'https://www.gifss.com/economia/juego/images/tragaperras-05.gif';

module.exports = {
    SYMBOLS,
    MIN_BET,
    MAX_BET,
    SLOT_IMAGE_URL,
};
