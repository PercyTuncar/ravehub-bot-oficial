const { findOrCreateUser } = require('../../utils/userUtils');
const { handleDebtPayment } = require('../../utils/debtManager');
const { getEligibleJobs } = require('../../utils/levels');
const Job = require('../../models/Job');

const jobs = [
  {
    name: 'DJ en Tomorrowland',
    description: '🎧 Hiciste bailar a miles con tu set en el Mainstage de Tomorrowland.',
    salary: 950,
    cooldown: 60, // minutos
  },
  {
    name: 'Seguridad de Vastion Group',
    description: '🛡️ Controlaste accesos y protegiste a los artistas en el backstage.',
    salary: 200,
    cooldown: 20,
  },
  {
    name: 'Seguridad de Ultra Perú',
    description: '🕶️ Aseguraste que todo fluya sin problemas en el ingreso del evento.',
    salary: 120,
    cooldown: 20,
  },
  {
    name: 'Lector de QR en ingreso',
    description: '🎟️ Escaneaste los tickets de los ravers emocionados por entrar.',
    salary: 80,
    cooldown: 10,
  },
  {
    name: 'Asistente de DJ',
    description: '🎚️ Ayudaste a preparar el setup antes del set del DJ principal.',
    salary: 380,
    cooldown: 30,
  },
  {
    name: 'Camarógrafo en festival',
    description: '📸 Capturaste los mejores momentos de la noche rave.',
    salary: 200,
    cooldown: 25,
  },
  {
    name: 'Reportero de RaveHub',
    description: '📰 Cubriste el evento entrevistando a ravers con mucha vibra.',
    salary: 450,
    cooldown: 35,
  },
  {
    name: 'Entrevistador de RaveHub',
    description: '🎤 Le sacaste declaraciones exclusivas al DJ después de su set.',
    salary: 550,
    cooldown: 45,
  },
  {
    name: 'Vendedor de merchandising',
    description: '🛍️ Vendiste pulseras, poleras y banderas a los fans.',
    salary: 150,
    cooldown: 15,
  },
  {
    name: 'Montaje de escenario',
    description: '🔧 Ayudaste en la instalación de luces, pantallas y pirotecnia.',
    salary: 310,
    cooldown: 30,
  },
  {
    name: 'Coordinador de accesos',
    description: '🚧 Organizaste las zonas VIP y los flujos de ingreso general.',
    salary: 70,
    cooldown: 10,
  },
  {
    name: 'Fotógrafo de RaveHub',
    description: '📷 Sacaste fotos épicas para las redes oficiales del festival.',
    salary: 480,
    cooldown: 40,
  },
  {
    name: 'Editor de videos post-evento',
    description: '🎞️ Editaste el aftermovie con los mejores momentos rave.',
    salary: 60,
    cooldown: 10,
  },
  {
    name: 'DJ de warm-up en rave local',
    description: '🎶 Animaste al público mientras esperaban al headliner.',
    salary: 220,
    cooldown: 25,
  },
  {
    name: 'Staff de limpieza en el festival',
    description: '🧹 Dejaste impecable el venue después de una noche de locura.',
    salary: 100,
    cooldown: 15,
  },
  {
    name: 'Responsable de guardarropas',
    description: '🎒 Cuidaste las pertenencias de los asistentes durante el evento.',
    salary: 180,
    cooldown: 20,
  },
  {
    name: 'Community manager de artista',
    description: '📱 Publicaste fotos en vivo desde el set del DJ.',
    salary: 530,
    cooldown: 45,
  },
  {
    name: 'Stage manager en rave internacional',
    description: '📋 Coordinaste todo el escenario para un festival de renombre mundial.',
    salary: 700,
    cooldown: 50,
  },
  {
    name: 'Coordinador de artistas internacionales',
    description: '✈️ Gestionaste la logística y agenda de DJs como Hardwell o Armin van Buuren.',
    salary: 850,
    cooldown: 55,
  },
  {
    name: 'Productor musical para sello discográfico',
    description: '🎵 Creaste un hit que sonó en todos los festivales del mundo.',
    salary: 1200,
    cooldown: 60,
  }
];

// Sincronizar trabajos con la base de datos al iniciar
(async () => {
    try {
        const jobNamesFromFile = jobs.map(j => j.name);

        // 1. Eliminar trabajos de la DB que no están en la lista del archivo
        await Job.deleteMany({ name: { $nin: jobNamesFromFile } });

        // 2. Actualizar o insertar los trabajos de la lista del archivo en la DB
        for (const jobData of jobs) {
            await Job.findOneAndUpdate({ name: jobData.name }, jobData, { upsert: true });
        }
        
        console.log('✅ La lista de trabajos ha sido sincronizada con la base de datos (con cooldowns individuales).');

    } catch (error) {
        console.error('Error al sincronizar los trabajos:', error);
    }
})();

module.exports = {
    name: 'work',
    description: 'Trabaja para ganar dinero y subir de nivel.',
    usage: '.work',
    category: 'economy',
    async execute(sock, message) {
        const senderJid = message.key.participant || message.key.remoteJid;
        const chatId = message.key.remoteJid;

        try {
            // Refactorización: Usar la función centralizada para obtener el usuario.
            let user = await findOrCreateUser(senderJid, message.pushName);

            // Corrección: Usar el nuevo campo de cooldown centralizado.
            if (user.cooldowns.work && user.cooldowns.work > new Date()) {
                const timeLeft = (user.cooldowns.work.getTime() - new Date().getTime()) / 1000;
                return sock.sendMessage(chatId, { text: `⏳ Debes esperar ${Math.ceil(timeLeft)} segundos más para volver a trabajar.` });
            }

            const eligibleJobs = getEligibleJobs(user.level);
            if (eligibleJobs.length === 0) {
                return sock.sendMessage(chatId, { text: 'No hay trabajos disponibles para tu nivel actual.' });
            }

            const job = eligibleJobs[Math.floor(Math.random() * eligibleJobs.length)];
            const earnings = job.salary;
            const xpGained = Math.floor(earnings / 10);

            let netGain = earnings;
            let debtMessage = '';
            let levelChangeMessage = '';

            // Manejar la deuda judicial si existe.
            if (user.judicialDebt > 0) {
                const result = handleDebtPayment(user, earnings);
                netGain = result.remainingAmount;
                debtMessage = result.debtMessage;
                levelChangeMessage = result.levelChangeMessage;
            }

            user.economy.wallet += netGain;
            user.xp += xpGained;

            // Aquí iría la lógica para verificar si el usuario sube de nivel
            // const { levelUp, newLevelName } = checkLevelUp(user);
            // if (levelUp) { ... }

            // Corrección: Actualizar el cooldown usando el campo correcto.
            user.cooldowns.work = new Date(new Date().getTime() + job.cooldown * 60 * 1000);
            await user.save();

            let response = `💼 *¡A trabajar!* 💼\n\n${job.description}\n\n*Ganaste:* ${earnings} 💵\n*XP Obtenida:* +${xpGained} XP`;
            if (debtMessage) {
                response += `\n\n${debtMessage}`;
            }
            if (levelChangeMessage) {
                response += `\n${levelChangeMessage}`;
            }
            response += `\n\n*Cartera actual:* ${user.economy.wallet} 💵`;

            sock.sendMessage(chatId, { text: response });

        } catch (error) {
            console.error('Error en el comando work:', error);
            sock.sendMessage(chatId, { text: '❌ Ocurrió un error al intentar trabajar.' });
        }
    },
};
