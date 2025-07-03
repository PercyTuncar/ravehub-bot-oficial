const cardValues = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const cardSuits = ['♠️', '♥️', '♦️', '♣️'];

function getRandomCard() {
    const valueIndex = Math.floor(Math.random() * cardValues.length);
    const suitIndex = Math.floor(Math.random() * cardSuits.length);
    return {
        display: `${cardValues[valueIndex]} ${cardSuits[suitIndex]}`,
        value: valueIndex
    };
}

module.exports = { getRandomCard };
