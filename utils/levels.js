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
    'Lector de QR en ingreso',
    'Staff de limpieza en el festival',
    'Coordinador de accesos',
    'Editor de videos post-evento',
  ],
  2: [
    'Vendedor de merchandising',
    'Responsable de guardarropas',
    'Seguridad de Ultra Perú',
  ],
  3: [
    'Montaje de escenario',
    'Seguridad de Vastion Group',
    'Camarógrafo en festival',
  ],
  4: ['DJ de warm-up en rave local', 'Asistente de DJ'],
  5: ['Reportero de RaveHub', 'Fotógrafo de RaveHub'],
  6: ['Community manager de artista', 'Entrevistador de RaveHub'],
  7: ['Stage manager en rave internacional'],
  8: ['Coordinador de artistas internacionales'],
  9: ['DJ en Tomorrowland', 'Productor musical para sello discográfico'],
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
  if (!allJobs) {
    console.error('Error: La lista de trabajos (allJobs) no puede ser undefined.');
    return []; // Devuelve un array vacío para evitar el crash
  }

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
