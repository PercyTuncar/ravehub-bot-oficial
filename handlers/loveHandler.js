const User = require('../models/User');
const { getSocket } = require('../bot');
const matchCommand = require('../commands/love/match');
const proposeCommand = require('../commands/love/propose');

async function handleLoveResponses(message) {
    const sock = getSocket();
    const from = message.key.remoteJid;
    const text = (message.message?.conversation || '').toLowerCase();
    const senderJid = message.key.participant || message.key.remoteJid;

    if (text !== 'acepto' && text !== 'rechazo') {
        return false;
    }

    // Manejo de Match
    const match = matchCommand.ongoingMatches.get(from);
    if (match) {
        const isUserA = match.userA.jid === senderJid;
        const isUserB = match.userB.jid === senderJid;

        if (!isUserA && !isUserB) return false;

        if (text === 'acepto') {
            if (isUserA) match.userA.accepted = true;
            if (isUserB) match.userB.accepted = true;

            if (match.userA.accepted && match.userB.accepted) {
                clearTimeout(match.timer);
                const userA = await User.findOne({ jid: match.userA.jid });
                const userB = await User.findOne({ jid: match.userB.jid });

                const startDate = new Date();
                userA.loveInfo.partnerId = userB._id;
                userA.loveInfo.partnerJid = userB.jid;
                userA.loveInfo.relationshipStatus = 'En una relación';
                userA.loveInfo.loveHistory.push({ partnerName: userB.name, startDate });

                userB.loveInfo.partnerId = userA._id;
                userB.loveInfo.partnerJid = userA.jid;
                userB.loveInfo.relationshipStatus = 'En una relación';
                userB.loveInfo.loveHistory.push({ partnerName: userA.name, startDate });
                
                await userA.save();
                await userB.save();

                const responseText = `💞 ¡Felicidades @${match.userA.jid.split('@')[0]} y @${match.userB.jid.split('@')[0]}!\n¡Han hecho MATCH y ahora son pareja oficial del grupo! ❤️`;
                sock.sendMessage(from, { text: responseText, mentions: [match.userA.jid, match.userB.jid] });
                matchCommand.ongoingMatches.delete(from);
            }
        } else { // rechazo
            clearTimeout(match.timer);
            const rejectedBy = isUserA ? match.userA.name : match.userB.name;
            const rejectedJid = isUserA ? match.userA.jid : match.userB.jid;
            const responseText = `💔 @${rejectedJid.split('@')[0]} ha rechazado el match.\nEl destino dirá si alguna vez se vuelven a cruzar...`;
            sock.sendMessage(from, { text: responseText, mentions: [rejectedJid] });
            matchCommand.ongoingMatches.delete(from);
        }
        return true;
    }

    // Manejo de Propuestas
    const proposalKey = Array.from(proposeCommand.ongoingProposals.keys()).find(k => k.split('-')[1] === senderJid);
    if (proposalKey) {
        const proposal = proposeCommand.ongoingProposals.get(proposalKey);
        if (senderJid !== proposal.proposed.jid) return false;

        clearTimeout(proposal.timer);
        if (text === 'acepto') {
            const proposer = await User.findOne({ jid: proposal.proposer.jid });
            const proposed = await User.findOne({ jid: proposal.proposed.jid });
            
            const startDate = new Date();
            proposer.loveInfo.partnerId = proposed._id;
            proposer.loveInfo.partnerJid = proposed.jid;
            proposer.loveInfo.relationshipStatus = 'En una relación';
            proposer.loveInfo.loveHistory.push({ partnerName: proposed.name, startDate });

            proposed.loveInfo.partnerId = proposer._id;
            proposed.loveInfo.partnerJid = proposer.jid;
            proposed.loveInfo.relationshipStatus = 'En una relación';
            proposed.loveInfo.loveHistory.push({ partnerName: proposer.name, startDate });

            await proposer.save();
            await proposed.save();

            const responseText = `💍 ¡Confirmado! @${proposer.jid.split('@')[0]} y @${proposed.jid.split('@')[0]} ahora están oficialmente en una relación. ❤️`;
            sock.sendMessage(from, { text: responseText, mentions: [proposer.jid, proposed.jid] });
        } else {
            const responseText = `💔 @${proposal.proposed.jid.split('@')[0]} ha rechazado la propuesta de @${proposal.proposer.jid.split('@')[0]}. ¡Ánimo, ya vendrá otra oportunidad!`;
            sock.sendMessage(from, { text: responseText, mentions: [proposal.proposer.jid, proposal.proposed.jid] });
        }
        proposeCommand.ongoingProposals.delete(proposalKey);
        return true;
    }
    return false;
}

module.exports = { handleLoveResponses };
