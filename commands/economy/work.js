const User = require('../../models/User');
const Job = require('../../models/Job');
const { xpTable, getLevelName, getEligibleJobs } = require('../../utils/levels');

const GLOBAL_COOLDOWN_MINUTES = 120; // 2 horas

const jobs = [
  {
    name: 'DJ en Tomorrowland',
    description: '🎧 Hiciste bailar a miles con tu set en el Mainstage de Tomorrowland.',
    salary: 950,
  },
  {
    name: 'Seguridad de Vastion Group',
    description: '🛡️ Controlaste accesos y protegiste a los artistas en el backstage.',
    salary: 200,
  },
  {
    name: 'Seguridad de Ultra Perú',
    description: '🕶️ Aseguraste que todo fluya sin problemas en el ingreso del evento.',
    salary: 120,
  },
  {
    name: 'Lector de QR en ingreso',
    description: '🎟️ Escaneaste los tickets de los ravers emocionados por entrar.',
    salary: 80,
  },
  {
    name: 'Asistente de DJ',
    description: '🎚️ Ayudaste a preparar el setup antes del set del DJ principal.',
    salary: 380,
  },
  {
    name: 'Camarógrafo en festival',
    description: '📸 Capturaste los mejores momentos de la noche rave.',
    salary: 200,
  },
  {
    name: 'Reportero de RaveHub',
    description: '📰 Cubriste el evento entrevistando a ravers con mucha vibra.',
    salary: 450,
  },
  {
    name: 'Entrevistador de RaveHub',
    description: '🎤 Le sacaste declaraciones exclusivas al DJ después de su set.',
    salary: 550,
  },
  {
    name: 'Vendedor de merchandising',
    description: '🛍️ Vendiste pulseras, poleras y banderas a los fans.',
    salary: 150,
  },
  {
    name: 'Montaje de escenario',
    description: '🔧 Ayudaste en la instalación de luces, pantallas y pirotecnia.',
    salary: 310,
  },
  {
    name: 'Coordinador de accesos',
    description: '🚧 Organizaste las zonas VIP y los flujos de ingreso general.',
    salary: 70,
  },
  {
    name: 'Fotógrafo de RaveHub',
    description: '📷 Sacaste fotos épicas para las redes oficiales del festival.',
    salary: 480,
  },
  {
    name: 'Editor de videos post-evento',
    description: '🎞️ Editaste el aftermovie con los mejores momentos rave.',
    salary: 60,
  },
  {
    name: 'DJ de warm-up en rave local',
    description: '🎶 Animaste al público mientras esperaban al headliner.',
    salary: 220,
  },
  {
    name: 'Staff de limpieza en el festival',
    description: '🧹 Dejaste impecable el venue después de una noche de locura.',
    salary: 100,
  },
  {
    name: 'Responsable de guardarropas',
    description: '🎒 Cuidaste las pertenencias de los asistentes durante el evento.',
    salary: 180,
  },
  {
    name: 'Community manager de artista',
    description: '📱 Publicaste fotos en vivo desde el set del DJ.',
    salary: 530,
  },
  {
    name: 'Stage manager en rave internacional',
    description: '📋 Coordinaste todo el escenario para un festival de renombre mundial.',
    salary: 700,
  },
  {
    name: 'Coordinador de artistas internacionales',
    description: '✈️ Gestionaste la logística y agenda de DJs como Hardwell o Armin van Buuren.',
    salary: 850,
  },
  {
    name: 'Productor musical para sello discográfico',
    description: '🎵 Creaste un hit que sonó en todos los festivales del mundo.',
    salary: 1200,
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
            // Se elimina la propiedad cooldown si existiera en la DB
            await Job.findOneAndUpdate({ name: jobData.name }, { ...jobData, $unset: { cooldown: "" } }, { upsert: true });
        }
        
        console.log('✅ La lista de trabajos ha sido sincronizada con la base de datos.');

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
            let user = await User.findOne({ jid: senderJid });
            if (!user) {
                user = new User({ 
                    jid: senderJid, 
                    name: message.pushName || senderJid.split('@')[0],
                });
            }

            const cooldownEnds = user.cooldownEnds;

            // --- INICIO DE LA NUEVA LÓGICA ---

            // 1. VERIFICAR SI EL USUARIO YA ESTÁ TRABAJANDO
            if (cooldownEnds && cooldownEnds > Date.now()) {
                const timeLeft = cooldownEnds - Date.now();
                const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                
                const currentJobText = user.currentJob ? `Actualmente estás trabajando como *${user.currentJob}*.` : 'Ya has trabajado recientemente.';

                return sock.sendMessage(chatId, { 
                    text: `${currentJobText} Debes esperar *${hours}h y ${minutes}m* para tomar una nueva chamba.` 
                });
            }

            // 2. SI EL COOLDOWN TERMINÓ, LIMPIAR EL TRABAJO ANTERIOR
            user.currentJob = null;

            // 3. ASIGNAR UN NUEVO TRABAJO
            const allJobs = await Job.find();
            if (allJobs.length === 0) {
                return sock.sendMessage(chatId, { text: 'No hay trabajos disponibles en este momento. Vuelve más tarde.' });
            }

            const eligibleJobs = getEligibleJobs(user.level, allJobs);

            if (eligibleJobs.length === 0) {
                if (user.level >= 10) {
                     return sock.sendMessage(chatId, { text: `¡Felicidades! Has alcanzado el nivel máximo. ¡Eres un verdadero King de Kines! 🔥👑💰` });
                }
                return sock.sendMessage(chatId, { text: `¡No tienes trabajos disponibles en tu nivel actual! Sigue esforzándote para subir de nivel y desbloquear más oportunidades.` });
            }

            const job = eligibleJobs[Math.floor(Math.random() * eligibleJobs.length)];

            // 4. ACTUALIZAR DATOS DEL USUARIO
            const xpGained = Math.floor(job.salary / 4); 
            user.economy.wallet += job.salary;
            user.xp += xpGained;
            user.lastWork = new Date();
            user.currentJob = job.name; // Guardar el trabajo actual

            let levelUp = false;
            while (user.level < 10 && user.xp >= xpTable[user.level]) {
                levelUp = true;
                user.level++;
            }

            await user.save();

            // 5. ENVIAR MENSAJE DE TRABAJO INICIADO
            let workMessage = `*¡Has comenzado a trabajar!* 💼\n\n`;
            workMessage += `*Puesto:* ${job.name}\n`;
            workMessage += `*Descripción:* ${job.description}\n\n`;
            workMessage += `*Salario Recibido:* +${job.salary} 💵\n`;
            workMessage += `*Experiencia Ganada:* +${xpGained} XP\n\n`;
            workMessage += `*Cartera actual:* ${user.economy.wallet} 💵`;

            await sock.sendMessage(chatId, {
                text: workMessage,
                mentions: [senderJid]
            });

            // 6. ENVIAR MENSAJE DE SUBIDA DE NIVEL (SI APLICA)
            if (levelUp) {
                let levelUpMessage = `*¡Felicidades, @${senderJid.split('@')[0]}!* 🎉\n\n`;
                levelUpMessage += `¡Has subido de nivel! Ahora eres ${getLevelName(user.level)}.\n\n`;

                if (user.level === 10) {
                    levelUpMessage += `*¡Beneficios de King de Kines desbloqueados!*\n`;
                    levelUpMessage += `- Acceso a TODOS los trabajos.\n`;
                    levelUpMessage += `- Respeto eterno en la comunidad RaveHub. 😎`;
                } else {
                    levelUpMessage += `¡Sigue así para desbloquear nuevos trabajos y recompensas!`;
                }
                
                await sock.sendMessage(chatId, {
                    text: levelUpMessage,
                    mentions: [senderJid]
                });
            }

        } catch (error) {
            console.error('Error en el comando work:', error);
            await sock.sendMessage(chatId, { text: 'Ocurrió un error al intentar trabajar.' });
        }
    }
};
