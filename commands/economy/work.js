const User = require('../../models/User');
const Job = require('../../models/Job');

// Pre-llenar trabajos si la colección está vacía
(async () => {
    try {
        const count = await Job.countDocuments();
        if (count === 0) {
            await Job.insertMany([
                { name: 'Programador', description: 'Escribes código y solucionas bugs.', salary: 500, cooldown: 2 }, // 2 horas
                { name: 'Diseñador', description: 'Creas interfaces de usuario y gráficos.', salary: 450, cooldown: 2 },
                { name: 'Taxista', description: 'Llevas gente por la ciudad.', salary: 200, cooldown: 1 },
                { name: 'Cocinero', description: 'Preparas comida deliciosa.', salary: 250, cooldown: 1 },
                { name: 'Mendigo', description: 'Pides limosna en la calle.', salary: 50, cooldown: 0.5 }, // 30 minutos
            ]);
            console.log('Trabajos iniciales creados.');
        }
    } catch (error) {
        console.error('Error al crear trabajos iniciales:', error);
    }
})();

module.exports = {
    name: 'work',
    description: 'Trabaja para ganar dinero.',
    category: 'economy',
    async execute(sock, message) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        try {
            let user = await User.findOne({ jid: senderJid });
            if (!user) {
                user = new User({ jid: senderJid, name: message.pushName || senderJid.split('@')[0] });
            }

            const availableJobs = await Job.find();
            if (availableJobs.length === 0) {
                return sock.sendMessage(chatId, { text: 'No hay trabajos disponibles en este momento. Vuelve más tarde.' });
            }

            // Asignar un trabajo aleatorio
            const job = availableJobs[Math.floor(Math.random() * availableJobs.length)];

            const lastWorkDate = user.lastWork;
            const cooldownHours = job.cooldown;
            const cooldownMs = cooldownHours * 60 * 60 * 1000;

            if (lastWorkDate && (Date.now() - lastWorkDate.getTime()) < cooldownMs) {
                const timeLeft = cooldownMs - (Date.now() - lastWorkDate.getTime());
                const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                return sock.sendMessage(chatId, { text: `Ya has trabajado recientemente. Debes esperar ${hours}h y ${minutes}m para volver a trabajar.` });
            }

            user.economy.wallet += job.salary;
            user.lastWork = new Date();
            await user.save();

            await sock.sendMessage(chatId, {
                text: `Trabajaste como *${job.name}* y ganaste ${job.salary} 🪙.\n\n*Nuevo saldo en cartera:* ${user.economy.wallet} 🪙`,
                mentions: [senderJid]
            });

        } catch (error) {
            console.error('Error en el comando work:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al intentar trabajar.' });
        }
    }
};
