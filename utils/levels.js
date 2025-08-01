const levelNames = [
  { name: 'Pollito', emoji: '🐣' },
  { name: 'Pulpin', emoji: '🤝' },
  { name: 'Chamba', emoji: '💼' },
  { name: 'Leder', emoji: '🪙' },
  { name: 'Barón', emoji: '😈' },
  { name: 'Crak', emoji: '🏆👌' },
  { name: 'Tigre', emoji: '🐯💵' },
  { name: 'Maestro', emoji: '🧠📊💵' },
  { name: 'King', emoji: '👑💵🪙' },
  { name: 'King de Kines', emoji: '👑💰🦁💸💵' },
];

// Dificultad aumentada: se requiere mucho más XP para cada nivel
const xpTable = [0, 1000, 2500, 5000, 9000, 15000, 22000, 30000, 40000, 52000];

const cooldownRanges = {
  1: { min: 2, max: 4 },
  2: { min: 3, max: 5 },
  3: { min: 4, max: 8 },
  4: { min: 5, max: 10 },
  5: { min: 8, max: 15 },
  6: { min: 10, max: 18 },
  7: { min: 12, max: 22 },
  8: { min: 15, max: 28 },
  9: { min: 20, max: 35 },
  10: { min: 25, max: 40 },
};

const allJobs = [
   { name: 'Lector de QR', description: '🎟️ Escaneaste los tickets de los ravers emocionados por entrar.', salary: 90, level: 1 },
{ name: 'Staff de limpieza', description: '🧹 Dejaste impecable el venue después de una noche de locura.', salary: 110, level: 1 },
{ name: 'Coordinador de accesos', description: '🚧 Organizaste las zonas VIP y los flujos de ingreso general.', salary: 80, level: 1 },
{ name: 'Editor de aftermovies', description: '🎞️ Editaste el aftermovie con los mejores momentos rave.', salary: 70, level: 1 },
{ name: 'Vendedor de merch', description: '🛍️ Vendiste pulseras, poleras y banderas a los fans.', salary: 160, level: 1 },
{ name: 'Guardarropas', description: '🎒 Cuidaste las pertenencias de los asistentes durante el evento.', salary: 190, level: 1 },
{ name: 'Limpiaste zapatos de Garrix', description: '👟 Un trabajo sucio pero alguien tenía que hacerlo. ¡Brillan!', salary: 60, level: 1 },
{ name: 'Vendedor de agua VASTION', description: '💧 Mantuviste a todos hidratados bajo el sol.', salary: 65, level: 1 },
{ name: 'Recogiste confeti de Guetta', description: '✨ El brillo es eterno, pero el suelo no se limpia solo.', salary: 75, level: 1 },
{ name: 'Limpiaste backstage Tiësto', description: '🧼 Dejaste el área de artistas impecable para la leyenda.', salary: 85, level: 1 },
{ name: 'Guardaste cables de Armin', description: '🔌 Un trabajo crucial para que el trance no se detenga.', salary: 95, level: 1 },
{ name: 'Vendedor chicles Creamfields', description: '🍬 Refrescaste el aliento de los fans más ansiosos.', salary: 55, level: 1 },
{ name: 'Limpiaste baños VIP UMF', description: '🚽 Una tarea poco glamorosa pero muy bien pagada.', salary: 120, level: 1 },
{ name: 'Cargaste maletas Hardwell', description: '🧳 ¡Cuidado con los CDJs! Llevaste el equipo de una estrella.', salary: 100, level: 1 },
{ name: 'Barriste antes de Aoki', description: '🎂 Preparaste el terreno para el famoso pastelazo.', salary: 105, level: 1 },
{ name: 'Vendiste pulseras LED DLDK', description: '💡 Iluminaste la noche de cientos de ravers.', salary: 70, level: 1 },
{ name: 'Limpiaste auto Calvin Harris', description: '🚗 Un coche de lujo necesita un cuidado de lujo.', salary: 110, level: 1 },
{ name: 'Guardaste ropa Marshmello', description: '🤫 Un secreto que te llevas a la tumba, y una buena paga.', salary: 130, level: 1 },
{ name: 'Vendiste palomitas Fedde', description: '🍿 El snack perfecto para empezar la noche.', salary: 60, level: 1 },
{ name: 'Limpiaste audífonos Romero', description: '🎧 El sonido perfecto depende de una limpieza perfecta.', salary: 140, level: 1 },
{ name: 'Cuidaste perro del DJ', description: '🐶 El mejor amigo del hombre, y del DJ, estuvo en buenas manos.', salary: 110, level: 1 },
{ name: 'Repartiste volantes playa', description: '📄 Promocionaste el próximo gran evento bajo el sol.', salary: 50, level: 1 },
{ name: 'Montaste stand Red Bull', description: '🥤 Te dio alas... y algo de dinero extra.', salary: 80, level: 1 },
{ name: 'Limpiaste camerinos', description: '✨ Dejaste todo listo para la siguiente estrella.', salary: 90, level: 1 },
{ name: 'Vendiste helados festival', description: '🍦 Fuiste el héroe del día para muchos ravers acalorados.', salary: 75, level: 1 },
{ name: 'Recogiste vasos reciclaje', description: '♻️ Ayudaste a que el festival sea un poco más ecológico.', salary: 65, level: 1 },
   
// Nivel 2
 { name: 'Seguridad Ultra Perú', description: '🕶️ Aseguraste que todo fluya sin problemas en el ingreso del evento.', salary: 130, level: 2 },
{ name: 'Acomodador VIP VASTION', description: '🤵‍♂️ Guiaste a los invitados más exclusivos a sus lugares.', salary: 140, level: 2 },
{ name: 'Vendedor bebidas Creamfields', description: '🍹 Serviste las bebidas que mantuvieron la energía a tope.', salary: 150, level: 2 },
{ name: 'Control pulseras DLDK', description: '✅ Verificaste que solo los verdaderos fans tuvieran acceso.', salary: 135, level: 2 },
{ name: 'Limpieza express Ultra', description: '🧹 Una carrera contra el tiempo para que el show continúe.', salary: 125, level: 2 },
{ name: 'Vendedor comida backstage', description: '🍔 Alimentaste al staff que hace posible la magia.', salary: 145, level: 2 },
{ name: 'Cuidador equipos sonido', description: '🔊 Protegiste los monitores y equipos de sonido secundarios.', salary: 160, level: 2 },
{ name: 'Asistente baños VIP', description: '🚽 Mantuviste la exclusividad hasta en el último rincón.', salary: 150, level: 2 },
{ name: 'Vendedor souvenirs VASTION', description: '🧢 Vendiste los recuerdos que los fans atesorarán.', salary: 170, level: 2 },
{ name: 'Staff hidratación artistas', description: '💧 Te aseguraste de que los DJs nunca tuvieran sed.', salary: 180, level: 2 },
{ name: 'Control zonas descanso', description: '🧘‍♂️ Garantizaste la tranquilidad en las áreas de relax.', salary: 140, level: 2 },
{ name: 'Limpiador cristales booth', description: '✨ Una vista clara para el DJ, una tarea importante para ti.', salary: 155, level: 2 },
{ name: 'Vendedor protectores auditivos', description: '👂 Cuidaste la salud auditiva de los ravers más precavidos.', salary: 165, level: 2 },
{ name: 'Asistente vestuario dancers', description: '💃 Ayudaste a que los bailarines lucieran espectaculares.', salary: 175, level: 2 },
{ name: 'Cargador baterías portátiles', description: '🔋 Mantuviste cargados los walkie-talkies y otros gadgets.', salary: 130, level: 2 },
{ name: 'Staff primeros auxilios', description: '⛑️ Brindaste asistencia rápida para pequeñas emergencias.', salary: 190, level: 2 },
{ name: 'Montaje carpas comida', description: '⛺ Ayudaste a levantar los puestos de comida a tiempo.', salary: 120, level: 2 },
{ name: 'Control stock bebidas', description: '📊 Te aseguraste de que nunca faltara la bebida.', salary: 150, level: 2 },
{ name: 'Ayudante cocina food trucks', description: '👨‍🍳 Fuiste el apoyo indispensable de los chefs del festival.', salary: 140, level: 2 },
{ name: 'Staff información público', description: '❓ Resolviste las dudas de los asistentes perdidos.', salary: 135, level: 2 },
{ name: 'Repartidor agua zonas baile', description: '💧 Un trabajo vital para mantener a todos bailando seguros.', salary: 160, level: 2 },


// Nivel 3
   { name: 'Montaje escenario', description: '🔧 Ayudaste en la instalación de luces, pantallas y pirotecnia.', salary: 320, level: 3 },
{ name: 'Seguridad Vastion Group', description: '🛡️ Controlaste accesos y protegiste a los artistas en el backstage.', salary: 210, level: 3 },
{ name: 'Camarógrafo festival', description: '📸 Capturaste los mejores momentos de la noche rave.', salary: 210, level: 3 },
{ name: 'Técnico luces DLDK', description: '💡 Programaste las secuencias de luces para un show increíble.', salary: 230, level: 3 },
{ name: 'Operador humo Creamfields', description: '💨 Creaste la atmósfera perfecta para los drops.', salary: 220, level: 3 },
{ name: 'Instalador pantallas LED Ultra', description: '🖥️ Montaste las gigantescas pantallas que todos admiran.', salary: 260, level: 3 },
{ name: 'Técnico cables VASTION', description: '🔌 El héroe anónimo que conecta todo el festival.', salary: 240, level: 3 },
{ name: 'Operador cámaras secundarias', description: '🎥 Ofreciste ángulos únicos para la transmisión en vivo.', salary: 250, level: 3 },
{ name: 'Montajista estructuras metálicas', description: '🏗️ Construiste el esqueleto del imponente escenario.', salary: 290, level: 3 },
{ name: 'Técnico pirotecnia básica', description: '🎆 Encendiste la chispa de la noche con fuegos artificiales.', salary: 310, level: 3 },
{ name: 'Instalador barricadas seguridad', description: '🚧 Mantuviste al público seguro y en su lugar.', salary: 200, level: 3 },
{ name: 'Operador grúas equipos', description: '🏗️ Moviste toneladas de equipo con precisión milimétrica.', salary: 330, level: 3 },
{ name: 'Técnico ventilación', description: '💨 Aseguraste que el aire circulara en las carpas más concurridas.', salary: 270, level: 3 },
{ name: 'Montador carpas VIP', description: '⛺ Creaste un oasis de lujo para los invitados especiales.', salary: 280, level: 3 },
{ name: 'Instalador piso danza', description: '🕺 Colocaste la superficie donde miles de personas bailaron.', salary: 250, level: 3 },
{ name: 'Técnico generadores eléctricos', description: '⚡ La energía del festival estuvo en tus manos.', salary: 340, level: 3 },
{ name: 'Operador plataformas elevadoras', description: '⬆️ Llevaste a los técnicos a las alturas para hacer su magia.', salary: 300, level: 3 },
{ name: 'Instalador sistemas drenaje', description: '💧 Evitaste que la lluvia arruinara la fiesta.', salary: 260, level: 3 },
{ name: 'Técnico sonido secundarios', description: '🔊 Calibraste el audio para los talentos emergentes.', salary: 290, level: 3 },
{ name: 'Electricista soporte evento', description: '⚡ Resolviste problemas eléctricos para que el show no parara.', salary: 320, level: 3 },
{ name: 'Carpintero reparaciones escenario', description: '🔨 Arreglaste cualquier desperfecto en las estructuras de madera.', salary: 270, level: 3 },
{ name: 'Soldador estructuras metálicas', description: '🔥 Uniste las piezas clave del esqueleto del festival.', salary: 350, level: 3 },
{ name: 'Supervisor seguridad andamios', description: '🧗‍♂️ Te aseguraste de que todos los trabajadores en altura estuvieran seguros.', salary: 310, level: 3 },


// Nivel 4
   { name: 'DJ warm-up rave local', description: '🎶 Animaste al público mientras esperaban al headliner.', salary: 230, level: 4 },
{ name: 'Asistente DJ', description: '🎚️ Ayudaste a preparar el setup antes del set del DJ principal.', salary: 390, level: 4 },
{ name: 'DJ residente after VASTION', description: '🎉 Mantuviste la fiesta viva hasta el amanecer.', salary: 410, level: 4 },
{ name: 'Operador mesa backup', description: '🎛️ Estabas listo para tomar el control si algo fallaba.', salary: 360, level: 4 },
{ name: 'DJ radio festival', description: '📻 Llevaste la energía del festival a todo el mundo.', salary: 380, level: 4 },
{ name: 'Selector musical chill', description: '🎵 Creaste el ambiente perfecto para relajarse.', salary: 330, level: 4 },
{ name: 'DJ sets acústicos lounges', description: '🎸 Mostraste tu versatilidad con un set más íntimo.', salary: 350, level: 4 },
{ name: 'Operador efectos visuales', description: '✨ Sincronizaste luces y visuales con la música.', salary: 370, level: 4 },
{ name: 'DJ calentamiento Creamfields', description: '🎧 Tu set fue la antesala de una noche legendaria.', salary: 400, level: 4 },
{ name: 'Mezclador audio B2B', description: '🎚️ Aseguraste que la transición entre DJs fuera perfecta.', salary: 420, level: 4 },
{ name: 'DJ closing DLDK', description: '🌇 Despediste a la multitud con un set inolvidable.', salary: 430, level: 4 },
{ name: 'Operador samples vivo', description: '🎹 Disparaste los sonidos que hicieron vibrar a todos.', salary: 390, level: 4 },
{ name: 'DJ especialista transiciones', description: '🔄 Tus mezclas suaves mantuvieron el flujo de energía.', salary: 410, level: 4 },
{ name: 'Creador playlists Ultra', description: '🎶 Seleccionaste los temas que definieron el sonido del festival.', salary: 440, level: 4 },
{ name: 'DJ eventos corporativos', description: '💼 Animaste las fiestas exclusivas para los patrocinadores.', salary: 380, level: 4 },
{ name: 'Operador software mezcla', description: '💻 Dominaste el software que usan los profesionales.', salary: 450, level: 4 },
{ name: 'DJ sesiones prueba sonido', description: '🔊 Ayudaste a calibrar el sistema de sonido principal.', salary: 370, level: 4 },
 

    // Nivel 5
   { name: 'Reportero RaveHub', description: '📰 Cubriste el evento entrevistando a ravers con mucha vibra.', salary: 460, level: 5 },
{ name: 'Fotógrafo RaveHub', description: '📷 Sacaste fotos épicas para las redes oficiales del festival.', salary: 490, level: 5 },
{ name: 'Blogger VASTION Group', description: '✍️ Escribiste las crónicas que todos leyeron al día siguiente.', salary: 470, level: 5 },
{ name: 'Fotógrafo backstage Creamfields', description: '📸 Capturaste los momentos íntimos de los artistas.', salary: 510, level: 5 },
{ name: 'Creador contenido Instagram Ultra', description: '📱 Tus historias y reels se hicieron virales.', salary: 530, level: 5 },
{ name: 'Documentalista giras DLDK', description: '🎥 Contaste la historia de la vida en la carretera.', salary: 550, level: 5 },
{ name: 'Fotógrafo prensa EDM', description: '📸 Tus fotos aparecieron en las revistas más importantes.', salary: 520, level: 5 },
{ name: 'Videomaker aftermovies oficiales', description: '🎬 Creaste la pieza que todos compartirán para recordar el evento.', salary: 590, level: 5 },
{ name: 'Podcaster entrevistas exclusivas', description: '🎙️ Conversaste cara a cara con los DJs del momento.', salary: 540, level: 5 },
{ name: 'Streamer oficial eventos', description: '🔴 Transmitiste la energía del festival a miles de hogares.', salary: 570, level: 5 },
{ name: 'Creador time-lapses montaje', description: '⏳ Mostraste en segundos el trabajo de días.', salary: 480, level: 5 },
{ name: 'Fotógrafo aéreo drones', description: '🚁 Ofreciste una perspectiva única y espectacular del festival.', salary: 610, level: 5 },
{ name: 'Editor contenido YouTube', description: '▶️ Editaste los videos que acumularon millones de vistas.', salary: 560, level: 5 },
{ name: 'Diseñador flyers digitales', description: '🎨 Creaste las imágenes que anunciaron la fiesta.', salary: 500, level: 5 },
{ name: 'Especialista fotografía nocturna', description: '🌃 Capturaste la magia de las luces y el láser.', salary: 580, level: 5 },
{ name: 'Creador contenido TikTok', description: '🕺 Tus videos cortos marcaron tendencia en la comunidad.', salary: 540, level: 5 },
{ name: 'Documentalista cultura rave', description: '🎥 Contaste las historias de los verdaderos protagonistas: los fans.', salary: 600, level: 5 }  , 

    // Nivel 6
  { name: 'Community manager Ultra', description: '📱 Manejaste las redes sociales de uno de los festivales más grandes.', salary: 600, level: 6 },
    { name: 'Community manager de artista', description: '📱 Publicaste fotos en vivo desde el set del DJ.', salary: 540, level: 6 },
    { name: 'Entrevistador de RaveHub', description: '🎤 Le sacaste declaraciones exclusivas al DJ después de su set.', salary: 560, level: 6 },
    { name: 'Social media manager VASTION', description: '📈 Manejaste las redes de una de las productoras más grandes.', salary: 630, level: 6 },
    { name: 'Relacionista público de Creamfields', description: '🤝 Gestionaste la imagen y comunicación del festival.', salary: 650, level: 6 },
    { name: 'Coordinador de prensa Ultra Music', description: '📰 Fuiste el enlace entre el festival y los medios de todo el mundo.', salary: 670, level: 6 },
    { name: 'Manager de redes sociales DLDK', description: '📱 Llevaste la voz de un gigante del EDM a millones de seguidores.', salary: 640, level: 6 },
    { name: 'Especialista en marketing digital EDM', description: '🚀 Diseñaste las campañas que vendieron miles de entradas.', salary: 690, level: 6 },
    { name: 'Coordinador de marca personal de DJ', description: '🌟 Ayudaste a construir la imagen de una superestrella.', salary: 710, level: 6 },
    { name: 'Gestor de colaboraciones con influencers', description: '🤳 Conectaste el festival con las voces más importantes de la red.', salary: 660, level: 6 },
    { name: 'Especialista en engagement de audiencias', description: '❤️ Creaste las interacciones que fidelizaron a los fans.', salary: 680, level: 6 },
    { name: 'Coordinador de campañas promocionales', description: '🎯 Ejecutaste las estrategias que llevaron el evento al siguiente nivel.', salary: 700, level: 6 },
    { name: 'Manager de comunicación corporativa', description: '🏢 Manejaste la comunicación interna y externa de la productora.', salary: 720, level: 6 },
    { name: 'Especialista en growth hacking musical', description: '📈 Encontraste las formas más creativas de hacer crecer la marca.', salary: 740, level: 6 },
    { name: 'Coordinador de partnerships estratégicos', description: '🤝 Cerraste acuerdos con marcas que beneficiaron al festival.', salary: 730, level: 6 },
    { name: 'Gestor de reputación online', description: '👍 Te aseguraste de que la conversación sobre el evento fuera siempre positiva.', salary: 690, level: 6 },
    { name: 'Especialista en analytics de redes sociales', description: '📊 Analizaste los datos que guiaron las decisiones de marketing.', salary: 710, level: 6 },
    { name: 'Coordinador de activaciones de marca', description: '🎉 Llevaste a la realidad las ideas de los patrocinadores.', salary: 670, level: 6 },

    // Nivel 7
    { name: 'Stage manager en rave internacional', description: '📋 Coordinaste todo el escenario para un festival de renombre mundial.', salary: 710, level: 7 },
    { name: 'Director técnico de VASTION Group', description: '🛠️ Fuiste el responsable de que toda la tecnología funcionara a la perfección.', salary: 760, level: 7 },
    { name: 'Coordinador general Creamfields Perú', description: '🇵🇪 Tuviste a tu cargo la operación de uno de los festivales más grandes del país.', salary: 790, level: 7 },
    { name: 'Supervisor de producción Ultra Music', description: '🎬 Supervisaste que cada detalle de la producción cumpliera con los más altos estándares.', salary: 810, level: 7 },
    { name: 'Director de operaciones DLDK', description: '⚙️ La máquina del festival funcionó gracias a tu liderazgo.', salary: 830, level: 7 },
    { name: 'Jefe de logística de gira internacional', description: '✈️ Moviste equipos y personas por todo el mundo sin contratiempos.', salary: 860, level: 7 },
    { name: 'Coordinador de rider técnico avanzado', description: '📋 Te aseguraste de que los DJs más exigentes tuvieran todo lo que pidieron.', salary: 780, level: 7 },
    { name: 'Director de seguridad en megafestival', description: '🛡️ La seguridad de miles de personas estuvo bajo tu responsabilidad.', salary: 890, level: 7 },
    { name: 'Supervisor de montaje de escenarios principales', description: '🏗️ Lideraste la construcción de las estructuras más impresionantes.', salary: 840, level: 7 },
    { name: 'Coordinador de transmisiones en vivo', description: '🔴 Dirigiste al equipo que llevó el festival al mundo entero.', salary: 820, level: 7 },
    { name: 'Director de experiencia VIP', description: '🌟 Creaste un mundo de lujo y exclusividad para los más exigentes.', salary: 870, level: 7 },
    { name: 'Jefe de coordinación multi-escenario', description: '🎶 Sincronizaste los tiempos y operaciones de todos los escenarios a la vez.', salary: 900, level: 7 },
    { name: 'Director de operaciones backstage', description: '🤫 Gobernante del mundo secreto detrás del escenario.', salary: 850, level: 7 },
    { name: 'Supervisor de logística de equipos', description: '🚚 Te aseguraste de que cada pieza de equipo llegara a tiempo y segura.', salary: 810, level: 7 },
    { name: 'Coordinador de protocolos de emergencia', description: '🚨 Preparaste al equipo para cualquier eventualidad.', salary: 910, level: 7 },
    { name: 'Director de flujos de audiencia masiva', description: '🚶‍♂️ Diseñaste cómo se moverían cientos de miles de personas de forma segura.', salary: 880, level: 7 },


    { name: 'Coordinador de artistas internacionales', description: '✈️ Gestionaste la logística y agenda de DJs como Hardwell o Armin van Buuren.', salary: 860, level: 8 },
    { name: 'Director de talento VASTION Group', description: '🌟 Descubriste y fichaste a las próximas estrellas de la escena.', salary: 930, level: 8 },
    { name: 'Booker principal Creamfields worldwide', description: '섭외 Contrataste a los DJs que encabezaron los festivales en todo el mundo.', salary: 960, level: 8 },
    { name: 'A&R de sello discográfico internacional', description: '💿 Fuiste el responsable de encontrar los próximos hits mundiales.', salary: 990, level: 8 },
    { name: 'Director creativo Ultra Music Festival', description: '🎨 Tu visión definió la estética y concepto de un festival icónico.', salary: 1010, level: 8 },
    { name: 'Curador musical de festival europeo', description: '🎶 Tu gusto musical dio forma al lineup de un evento masivo.', salary: 980, level: 8 },
    { name: 'Director de desarrollo de nuevos talentos', description: '🚀 Impulsaste la carrera de los DJs del mañana.', salary: 940, level: 8 },
    { name: 'Coordinador de giras mundiales EDM', description: '🌍 Organizaste los tours que llevaron la música electrónica a cada rincón.', salary: 970, level: 8 },
    { name: 'Director de alianzas estratégicas DLDK', description: '🤝 Creaste las conexiones que hicieron al festival aún más grande.', salary: 1060, level: 8 },
    { name: 'Gestor de contratos millonarios', description: '💼 Negociaste los acuerdos que movieron cifras astronómicas.', salary: 1110, level: 8 },
    { name: 'Director de innovación en eventos', description: '💡 Llevaste la experiencia del festival al futuro con nuevas tecnologías.', salary: 1090, level: 8 },
    { name: 'Curador de experiencias inmersivas', description: '🌌 Diseñaste mundos dentro del festival que volaron la mente de todos.', salary: 1070, level: 8 },
    { name: 'Director de expansión internacional', description: '🌎 Llevaste la marca del festival a nuevos países.', salary: 1160, level: 8 },
    { name: 'Especialista en booking de tier 1', description: '섭외 Solo tú podías conseguir a los 10 mejores DJs del mundo.', salary: 1210, level: 8 },
    { name: 'Director de desarrollo de mercados emergentes', description: '📈 Identificaste y conquistaste nuevas fronteras para la música electrónica.', salary: 1130, level: 8 },
    { name: 'Consultor estratégico de la industria EDM', description: '🧠 Las grandes marcas te pagaron por tu visión y conocimiento.', salary: 1260, level: 8 },


    { name: 'DJ en Tomorrowland', description: '🎧 Hiciste bailar a miles con tu set en el Mainstage de Tomorrowland.', salary: 960, level: 9 },
    { name: 'Productor musical para sello discográfico', description: '🎵 Creaste un hit que sonó en todos los festivales del mundo.', salary: 1210, level: 9 },
    { name: 'Headliner principal Ultra Miami', description: '🌟 Tu nombre encabezó el cartel del festival más importante de América.', salary: 1310, level: 9 },
    { name: 'DJ residente Ibiza temporada completa', description: '🇪🇸 Fuiste la estrella de la isla de la fiesta durante todo el verano.', salary: 1410, level: 9 },
    { name: 'Productor ejecutivo de álbum platino', description: '💿 Dirigiste la creación de un álbum que vendió millones.', salary: 1510, level: 9 },
    { name: 'DJ principal Creamfields UK mainstage', description: '🇬🇧 Conquistaste uno de los escenarios más legendarios del mundo.', salary: 1360, level: 9 },
    { name: 'Fundador de sello discográfico top 10', description: '🚀 Tu sello se convirtió en un referente mundial de la música.', salary: 1610, level: 9 },
    { name: 'Director artístico Tomorrowland Brasil', description: '🇧🇷 Llevaste la magia de Tomorrowland a Sudamérica con tu visión.', salary: 1460, level: 9 },
    { name: 'DJ exclusivo Las Vegas residency', description: '🎰 Te pagaron una fortuna por tocar en la ciudad del pecado.', salary: 1710, level: 9 },
    { name: 'Productor de hit #1 Billboard Dance', description: '🏆 Tu canción llegó a lo más alto de las listas mundiales.', salary: 1810, level: 9 },
    { name: 'Curator principal Spotify Electronic', description: '🎧 Tus playlists definieron las tendencias para millones de oyentes.', salary: 1560, level: 9 },
    { name: 'DJ embajador de marca multinacional', description: '💼 Una marca global te eligió como su imagen en el mundo de la música.', salary: 1760, level: 9 },
    { name: 'Director creativo de tour mundial', description: '🌍 Diseñaste el concepto de una gira que recorrió los cinco continentes.', salary: 1660, level: 9 },
    { name: 'Productor de remix oficial Grammy', description: '🏆 Te llamaron para remezclar una canción ganadora de un Grammy.', salary: 1910, level: 9 },
    { name: 'DJ principal Electric Daisy Carnival', description: '🎡 Fuiste la estrella principal del carnaval eléctrico de Las Vegas.', salary: 1860, level: 9 },
    { name: 'Fundador de plataforma streaming EDM', description: '💻 Creaste la competencia de Spotify y Apple Music para la electrónica.', salary: 2010, level: 9 },
    { name: 'Director artístico Amsterdam Dance Event', description: '🇳🇱 Estuviste al mando del evento más importante de la industria musical.', salary: 1960, level: 9 },
];

function getLevelName(level) {
  if (level > 0 && level <= levelNames.length) {
    const { name, emoji } = levelNames[level - 1];
    return `${name} ${emoji}`;
  }
  return 'Nivel Desconocido';
}

function getEligibleJobs(userLevel) {
  // Only return jobs that match the user's exact level for exclusivity.
  const jobs = allJobs.filter(job => job.level === userLevel);
  return jobs;
}

function getNextLevelXP(level) {
    if (level > 0 && level < xpTable.length) {
        return xpTable[level];
    }
    // If max level, return the last value
    if (level >= xpTable.length) {
        return xpTable[xpTable.length - 1];
    }
    return 0;
}

module.exports = {
  levelNames,
  xpTable,
  allJobs,
  getLevelName,
  getEligibleJobs,
  getNextLevelXP,
  cooldownRanges,
};
