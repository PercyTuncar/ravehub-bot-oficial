const { MessageMedia } = require('whatsapp-web.js');
const User = require('../../models/User');
const GameLog = require('../../models/GameLog');
const { getRandomCard } = require('./utils');
const { casinoImages, MIN_BET, MAX_BET } = require('./constants');
const { getMention, findOrCreateUser } = require('../../utils/userUtils');
const { addGameSession, getGameSession, removeGameSession } = require('../../utils/gameUtils');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function startGame(client, message, args) {
    const { from, author } = message;
    const senderId = author;
    const betAmount = parseInt(args[0], 10);

    const user = await findOrCreateUser(senderId);
    const mention = await getMention(client, message);

    const sessionTimeout = 30000; // 30 segundos
    const timer = setTimeout(async () => {
        removeGameSession(senderId);
        await client.sendMessage(from, `⏰ @${senderId.split('@')[0]}, tu sesión de juego ha expirado por inactividad.`, { mentions: [mention] });
    }, sessionTimeout);

    addGameSession(senderId, {
        game: 'cartaMayor',
        betAmount,
        stage: 'CHOOSING_SIDE',
        timer,
    });

    await client.sendMessage(from,
        `🎮 ¡Comienza el juego de la *Carta Mayor*!\n\n` +
        `*Apuesta:* ${betAmount} 💵\n` +
        `*Participante:* @${senderId.split('@')[0]}\n\n` +
        `Elige un lado: *Izquierda*, *Derecha* o *Empate*.\n\n` +
        `Si aciertas Izquierda/Derecha, duplicas tu apuesta. Si aciertas Empate, ¡ganas 5 veces tu apuesta!`,
        { mentions: [mention] }
    );
}

async function playDirectGame(client, message, args) {
    const { from, author } = message;
    const senderId = author;
    const betAmount = parseInt(args[0], 10);
    const choice = args[1].toLowerCase();

    const user = await findOrCreateUser(senderId);

    const playerCard = getRandomCard();
    const botCard = getRandomCard();

    let win = false;
    if (choice === 'yo' && playerCard.value > botCard.value) {
        win = true;
    } else if (choice === 'bot' && botCard.value > playerCard.value) {
        win = true;
    }

    const mention = await getMention(client, message);
    let resultMessage;
    let gameResultForLog;

    const playerCardMessage = `Tu carta: ${playerCard.rank}${playerCard.suit}`;
    const botCardMessage = `Mi carta: ${botCard.rank}${botCard.suit}`;

    if (playerCard.value === botCard.value) {
        resultMessage = `${mention}, es un empate! No pierdes ni ganas nada.`;
        gameResultForLog = { win: false, tie: true, amount: 0 };
    } else if (win) {
        user.balance += betAmount;
        resultMessage = `${mention}, has ganado ${betAmount} coins!`;
        gameResultForLog = { win: true, tie: false, amount: betAmount };
    } else {
        user.balance -= betAmount;
        resultMessage = `${mention}, has perdido ${betAmount} coins.`;
        gameResultForLog = { win: false, tie: false, amount: -betAmount };
    }

    await user.save();
    await GameLog.create({
        userId: senderId,
        game: 'cartaMayor',
        bet: betAmount,
        win: gameResultForLog.win,
        tie: gameResultForLog.tie,
        amount: gameResultForLog.amount,
        groupId: from,
        result: win ? choice : (playerCard.value === botCard.value ? 'empate' : (choice === 'yo' ? 'bot' : 'yo'))
    });

    const randomImage = casinoImages[Math.floor(Math.random() * casinoImages.length)];
    const image = await MessageMedia.fromUrl(randomImage);
    const finalCaption = `${playerCardMessage}\n${botCardMessage}\n\n${resultMessage}`;
    client.sendMessage(from, image, { caption: finalCaption, mentions: [mention] });
}

async function handlePlayerChoice(client, message) {
    const { from, author } = message;
    const senderId = author;
    const session = getGameSession(senderId);

    if (!session || session.game !== 'cartaMayor' || session.stage !== 'CHOOSING_SIDE') return;

    const choice = (message.body || '').toLowerCase().trim();
    if (choice !== 'izquierda' && choice !== 'derecha' && choice !== 'empate') {
        const mention = await getMention(client, message);
        return client.sendMessage(from, `🚫 @${senderId.split('@')[0]}, tu respuesta no es válida.

Por favor, elige *Izquierda*, *Derecha* o *Empate* para continuar tu partida.`, { mentions: [mention] });
    }

    if (session.timer) {
        clearTimeout(session.timer);
        session.timer = null;
    }

    session.stage = 'REVEALING';
    const mention = await getMention(client, message);
    const choiceCapitalized = choice.charAt(0).toUpperCase() + choice.slice(1);

    await client.sendMessage(from, `🃏 @${senderId.split('@')[0]}, has elegido *${choiceCapitalized}*.\n\nEl crupier baraja las cartas y las coloca sobre la mesa. ¡Mucha suerte!`, { mentions: [mention] });
    await delay(2000);

    const leftCard = getRandomCard();
    const rightCard = getRandomCard();
    const user = await User.findById(senderId);

    let finalMessage = '';
    let winnings = 0;
    let gameOutcome;

    if (leftCard.value > rightCard.value) gameOutcome = 'izquierda';
    else if (rightCard.value > leftCard.value) gameOutcome = 'derecha';
    else gameOutcome = 'empate';

    const leftCardName = `*${leftCard.rank} de ${leftCard.suit}*`;
    const rightCardName = `*${rightCard.rank} de ${rightCard.suit}*`;

    await client.sendMessage(from, `@${senderId.split('@')[0]}, estamos revelando las cartas... 🤞`, { mentions: [mention] });
    await delay(1500);
    await client.sendMessage(from, `> Carta Izquierda: ${leftCardName}`);
    await delay(1500);
    await client.sendMessage(from, `Ahora, la segunda carta... ¿Será igual? 🤔`);
    await delay(2000);
    await client.sendMessage(from, `> Carta Derecha: ${rightCardName}`);
    await delay(1500);

    if (choice === 'empate') {
        if (gameOutcome === 'empate') {
            winnings = session.betAmount * 5;
            user.balance += winnings;
            finalMessage = `🤯 *¡EMPATE PERFECTO, @${senderId.split('@')[0]}!*\nTu predicción fue correcta.\n\n*Premio:* *${winnings} 💵*`;
        } else {
            user.balance -= session.betAmount;
            finalMessage = `😢 *NO HUBO EMPATE, @${senderId.split('@')[0]}!*\nLas cartas no coincidieron.\n\n*Apuesta perdida:* *${session.betAmount} 💵*`;
        }
    } else {
        if (choice === gameOutcome) {
            winnings = session.betAmount;
            user.balance += winnings;
            finalMessage = `🎉 *¡GANASTE, @${senderId.split('@')[0]}!*\nTu carta fue la más alta.\n\n*Premio:* *${session.betAmount * 2} 💵*`;
        } else if (gameOutcome === 'empate') {
            user.balance -= session.betAmount;
            finalMessage = `😐 *¡EMPATE INESPERADO, @${senderId.split('@')[0]}!*\nLas cartas fueron idénticas.\n\n*Apuesta perdida:* *${session.betAmount} 💵*`;
        } else {
            user.balance -= session.betAmount;
            finalMessage = `😢 *¡PERDISTE, @${senderId.split('@')[0]}!*\nLa carta de la casa fue superior.\n\n*Apuesta perdida:* *${session.betAmount} 💵*`;
        }
    }

    await GameLog.create({
        userId: senderId,
        game: 'cartaMayor',
        bet: session.betAmount,
        win: winnings > 0,
        tie: gameOutcome === 'empate',
        amount: winnings > 0 ? winnings : -session.betAmount,
        groupId: from,
        result: gameOutcome
    });

    await user.save();
    removeGameSession(senderId);

    const randomImage = casinoImages[Math.floor(Math.random() * casinoImages.length)];
    const image = await MessageMedia.fromUrl(randomImage);
    const finalCaption = `${finalMessage}\n\nGracias por jugar en el Casino RaveHub.`;

    await client.sendMessage(from, image, { caption: finalCaption, mentions: [mention] });
}

module.exports = { startGame, playDirectGame, handlePlayerChoice };
