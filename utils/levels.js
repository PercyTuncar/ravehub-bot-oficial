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

const xpTable = [0, 500, 1000, 1800, 3000, 4500, 6300, 8400, 10800, 13500];

const jobsByLevel = {
  1: [
    'Lector de QR en ingreso',
    'Staff de limpieza en el festival',
    'Coordinador de accesos',
    'Editor de videos post-evento',
    'Vendedor de merchandising',
    'Responsable de guardarropas',
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
  // Asegurarse de que allJobs es un array antes de usarlo
  if (!Array.isArray(allJobs) || allJobs.length === 0) {
    console.error('Error: La lista de trabajos (allJobs) está vacía o no es un array.');
    return [];
  }

  if (userLevel >= 10) {
    return allJobs; // Nivel 10+ tiene acceso a todos los trabajos
  }

  let eligibleJobNames = [];
  // Acumula todos los trabajos desde el nivel 1 hasta el nivel del usuario
  for (let i = 1; i <= userLevel; i++) {
    if (jobsByLevel[i]) {
      eligibleJobNames.push(...jobsByLevel[i]);
    }
  }

  // Filtra la lista completa de trabajos para devolver solo los que son elegibles
  return allJobs.filter(job => eligibleJobNames.includes(job.name));
}

module.exports = {
  xpTable,
  getLevelName,
  getEligibleJobs,
};
