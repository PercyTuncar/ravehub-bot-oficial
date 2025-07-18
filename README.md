# ravehub-bot-oficial

CAMBIOS DE ESTRUCTURA EN EL CÓDIGO


 Actualmente, la lógica del juego "carta mayor" está distribuida entre
  commands/economy/apostar.js (para el inicio directo) y handlers/gameHandler.js (para la
  interacción durante el juego). Esto genera duplicación y dificulta la gestión.


  Propongo la siguiente mejora estructural para organizar los juegos de manera más modular y
  escalable, manteniendo las dos formas de inicio y respetando los mensajes y textos existentes:

  Nueva Estructura Propuesta:



    1 ravehub-bot-oficial/
    2 ├───commands/
    3 │   ├───economy/
    4 │   │   └───... (apostar.js se moverá de aquí)
    5 │   └───games/             <-- NUEVO DIRECTORIO para los comandos de juego
    6 │       ├───cartaMayor.js  <-- Comando principal para Carta Mayor (.apostar)
    7 │       └───ruleta.js      <-- FUTURO: Comando principal para Ruleta (.ruleta)
    8 ├───handlers/
    9 │   ├───gameHandler.js     <-- Se simplificará para despachar a manejadores
      específicos de juego
   10 │   └───...
   11 ├───models/
   12 │   ├───GameLog.js         <-- Se mantiene, es genérico para todos los juegos
   13 │   └───...
   14 ├───utils/
   15 │   ├───gameUtils.js       <-- Contendrá solo la gestión general de sesiones de
      juego
   16 │   └───...
   17 └───games/                 <-- NUEVO DIRECTORIO para la lógica y utilidades
      específicas de cada juego
   18     ├───cartaMayor/
   19     │   ├───index.js       <-- Lógica principal del juego Carta Mayor
   20     │   ├───utils.js       <-- Utilidades específicas de Carta Mayor (ej.
      getRandomCard)
   21     │   └───constants.js   <-- Constantes específicas de Carta Mayor (MIN_BET,
      MAX_BET, casinoImages)
   22     └───ruleta/            <-- FUTURO: Directorio para el juego Ruleta
   23         ├───index.js
   24         └───utils.js


  Plan de Implementación:


   1. Crear directorios:
       * C:/Users/percy/OneDrive/Escritorio/ravehub-bot-oficial/commands/games/
       * C:/Users/percy/OneDrive/Escritorio/ravehub-bot-oficial/games/
       * C:/Users/percy/OneDrive/Escritorio/ravehub-bot-oficial/games/cartaMayor/
   2. Mover y Renombrar `apostar.js`:
       * Mover commands/economy/apostar.js a commands/games/cartaMayor.js.
   3. Crear `games/cartaMayor/constants.js`: Mover MIN_BET, MAX_BET y casinoImages de
      commands/games/cartaMayor.js a este nuevo archivo.
   4. Crear `games/cartaMayor/utils.js`: Mover getRandomCard y cardValues, cardSuits, rankValues de        
      utils/gameUtils.js a este nuevo archivo.
   5. Crear `games/cartaMayor/index.js`:
       * Mover la función playGame de commands/games/cartaMayor.js a este archivo.
       * Mover la lógica de manejo de la elección del lado del usuario (la parte relevante de
         handleGameMessage en handlers/gameHandler.js) a este archivo. Este archivo exportará
         funciones como startGame (para el inicio directo) y handlePlayerChoice (para la
         interacción).
   6. Refactorizar `commands/games/cartaMayor.js`:
       * Actualizar las importaciones para usar los nuevos archivos de games/cartaMayor/.
       * Delegar la lógica de juego a las funciones exportadas desde games/cartaMayor/index.js.
   7. Refactorizar `handlers/gameHandler.js`:
       * Simplificar handleGameMessage para que actúe como un despachador genérico. Identificará el        
         juego activo para el usuario y llamará a la función handlePlayerChoice específica de ese
         juego (ej. require('../games/cartaMayor').handlePlayerChoice(message)).
   8. Refactorizar `utils/gameUtils.js`:
       * Eliminar la lógica de cartas (getRandomCard, suits, ranks, rankValues) que se moverá a
         games/cartaMayor/utils.js.
       * Mantener solo las funciones de gestión de sesiones genéricas (startGameSession,
         getGameSession, endGameSession, activeGameSessions).
   9. Verificar `commands/utility/estadisticas.js`: Asegurarse de que sigue funcionando
      correctamente con el GameLog existente. No debería requerir cambios significativos ya que
      consulta por gameName.


  Este enfoque garantizará que cada juego tenga su propio espacio, facilitando la adición de
  nuevos juegos y manteniendo la lógica de sesión por usuario intacta.

El objetivo principal de esta refactorización es mejorar la estructura
  interna sin alterar la experiencia del usuario.
 Los dos comandos (`.apostar monto` y `.apostar monto lado`) seguirán funcionando exactamente 
     igual. La lógica para diferenciar entre ellos y el flujo de interacción se mantendrá en el
     nuevo commands/games/cartaMayor.js y en el manejador de juego.
   * Los mensajes y respuestas deben ser iguales  . asegurate  de que todos los textos, formatos y
     menciones a los usuarios se conserven tal cual están actualmente.

