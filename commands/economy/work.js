const User = require('../../models/User');
const Job = require('../../models/Job');
const { xpTable, getLevelName, getEligibleJobs } = require('../../utils/levels');
const { handleDebtPayment } = require('../../utils/debtManager');

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
            let user = await User.findOne({ jid: senderJid });
            if (!user) {
                user = new User({ 
                    jid: senderJid, 
                    name: message.pushName || senderJid.split('@')[0],
                });
            }

            // --- INICIO DE LA LÓGICA DE COOLDOWN REFORZADA ---

            // 1. VERIFICAR SI EL USUARIO TIENE UN COOLDOWN ACTIVO
            if (user.cooldownEnds && user.cooldownEnds > new Date()) {
                const now = new Date();
                const timeLeft = user.cooldownEnds.getTime() - now.getTime();
                const minutes = Math.floor(timeLeft / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                
                let cooldownMessage = `*¡Hey, @${senderJid.split('@')[0]}!* 🕒\n\n`;
                if (user.currentJob) {
                    cooldownMessage += `Aún estás en tu turno como *${user.currentJob}*.`;
                } else {
                    cooldownMessage += `Tomaste un descanso hace poco.`;
                }
                cooldownMessage += `\n\nDebes esperar *${minutes}m y ${seconds}s* para volver a trabajar.`;


                return sock.sendMessage(chatId, { 
                    text: cooldownMessage,
                    mentions: [senderJid]
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
            const now = new Date();
            const cooldownMinutes = job.cooldown;
            user.cooldownEnds = new Date(now.getTime() + cooldownMinutes * 60 * 1000);
            user.currentJob = job.name; // Guardar el trabajo actual

            let salary = job.salary;
            const xpGained = Math.floor(salary / 4);
            let finalDebtMessage = '';
            let finalLevelChangeMessage = '';

            // --- LÓGICA DE DEUDA JUDICIAL ---
            if (user.judicialDebt > 0) {
                const { remainingAmount, debtMessage, levelChangeMessage } = handleDebtPayment(user, salary);
                salary = remainingAmount; // El salario neto es lo que queda después de pagar la deuda
                finalDebtMessage = debtMessage;
                finalLevelChangeMessage = levelChangeMessage;
                // Si pagó deuda, no gana XP del trabajo, solo la pierde por la deuda
            } else {
                user.xp += xpGained; // Gana XP solo si no tiene deudas
            }
            
            user.economy.wallet += salary;

            let levelUp = false;
            const originalLevel = user.level;
            while (user.level < 10 && user.xp >= xpTable[user.level]) {
                levelUp = true;
                user.level++;
            }

            await user.save();

            // 5. ENVIAR MENSAJE DE TRABAJO
            let workMessage = `*@${senderJid.split('@')[0]} ¡Has comenzado a trabajar!* 💼\n\n`;
            workMessage += `*Puesto:* ${job.name}\n`;
            workMessage += `*Descripción:* ${job.description}\n\n`;
            
            if (finalDebtMessage) {
                await sock.sendMessage(chatId, { text: finalDebtMessage, mentions: [senderJid] });
                if (finalLevelChangeMessage) {
                    await sock.sendMessage(chatId, { text: finalLevelChangeMessage, mentions: [senderJid] });
                }
            } else {
                 workMessage += `*Salario Recibido:* +${salary} 💵\n`;
                 workMessage += `*Experiencia Ganada:* +${xpGained} XP\n\n`;
            }
            
            workMessage += `*Cartera actual:* ${user.economy.wallet} 💵`;

            await sock.sendMessage(chatId, {
                text: workMessage,
                mentions: [senderJid]
            });

            // 6. ENVIAR MENSAJE DE SUBIDA DE NIVEL (SI APLICA Y NO BAJÓ DE NIVEL)
            if (levelUp && user.level > originalLevel) {
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
