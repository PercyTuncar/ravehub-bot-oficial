const levelNames = [
  { name: 'Nivel Pollito', emoji: '🐣' },
  { name: 'Nivel Pulpin', emoji: '🤝' },
  { name: 'Nivel Chamba', emoji: '💼' },
  { name: 'Nivel Leder', emoji: '🪙' },
  { name: 'Nivel Mostrito', emoji: '😈' },
  { name: 'Nivel Crak', emoji: '🪙👌' },
  { name: 'Nivel Tigre', emoji: '🐯💵' },
  { name: 'Nivel Maestro', emoji: '🧠💼💵' },
  { name: 'Nivel Pitucazo', emoji: '👑💸💵🪙' },
  { name: 'Nivel King de Kines', emoji: '🔥👑💰🦁💵💵💵' },
];

const xpTable = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500];

const jobsByLevel = {
  1: [
    'Lector de QR',
    'Staff de limpieza',
    'Coordinador de accesos',
    'Editor de videos post-evento',
  ],
  2: ['Responsable de guardarropas', 'Vendedor de merchandising'],
  3: ['Seguridad de Ultra Perú', 'Montaje de escenario'],
  4: ['Seguridad de Vastion Group', 'DJ de warm-up', 'Camarógrafo en festival'],
  5: ['Reportero de RaveHub', 'Asistente de DJ'],
  6: ['Fotógrafo de RaveHub', 'Community manager de artista'],
  7: ['Entrevistador de RaveHub'],
  8: ['DJ en evento privado', 'Stage manager en rave internacional'],
  9: ['DJ en Tomorrowland', 'Coordinador de artistas internacionales'],
  10: [], // Nivel 10 tiene acceso a todos
};

function getLevelName(level) {
  if (level > 0 && level <= levelNames.length) {
    const { name, emoji } = levelNames[level - 1];
    return `${name} ${emoji}`;
  }
  return 'Nivel Desconocido';
}

function getEligibleJobs(userLevel, allJobs) {
  if (userLevel >= 10) {
    return allJobs; // Acceso a todos los trabajos
  }

  let eligibleJobNames = [];
  for (let i = 1; i <= userLevel; i++) {
    if (jobsByLevel[i]) {
      eligibleJobNames = eligibleJobNames.concat(jobsByLevel[i]);
    }
  }

  return allJobs.filter(job => eligibleJobNames.includes(job.name));
}

module.exports = {
  xpTable,
  getLevelName,
  getEligibleJobs,
};
