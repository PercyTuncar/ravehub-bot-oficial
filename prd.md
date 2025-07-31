# RaveHub Bot - Documento de Requisitos del Producto (PRD)

## 📋 Resumen Ejecutivo

**RaveHub Bot** es un bot multifuncional para WhatsApp que simula un ecosistema económico y social completo dentro de grupos, utilizando las tecnologías más modernas: Baileys, Node.js, MongoDB, Next.js y JavaScript asíncrono avanzado. Cada grupo funciona como una ciudad virtual independiente con su propia economía, moneda y comunidad.

---

## 🎯 Objetivos del Proyecto

- Crear una experiencia de "vida virtual" inmersiva en WhatsApp
- Implementar un sistema económico completo con trabajos, banco, tienda y préstamos
- Proporcionar gamificación através de niveles, XP y misiones
- Mantener ecosistemas independientes por grupo
- Ofrecer experiencia web complementaria en `ravehublatam.com`
- Sistema de morosidad con **InfoCorp/SBS** para deudores
- Préstamos **entre usuarios** y del **banco** con evaluación crediticia
- Conversión automática de divisas con APIs en **fallback**

---

## 🛠️ Stack Tecnológico

```json
{
  "backend": {
    "bot_engine": "Baileys (última versión)",
    "runtime": "Node.js 20+ con JavaScript asíncrono moderno",
    "database": "MongoDB 7.0+",
    "odm": "Mongoose 8.0+",
    "process_manager": "PM2",
    "currency_apis": [
      "Frankfurter API (primaria)",
      "ExchangeRate API (fallback 1)",
      "CurrencyFreaks (fallback 2)", 
      "Open Exchange Rates (fallback 3)"
    ]
  },
  "frontend": {
    "framework": "Next.js 14+ con App Router",
    "styling": "Tailwind CSS",
    "components": "React 18+"
  },
  "infrastructure": {
    "domain": "ravehublatam.com",
    "deployment": "Vercel (Web) + VPS Ubuntu (Bot)"
  }
}
```

---

## 📁 Estructura de Proyecto Escalable

```
RaveHub-Bot/
├── src/
│   ├── bot/
│   │   ├── index.js                     # 🚀 Único punto de entrada
│   │   ├── core/
│   │   │   ├── client.js                # Configuración Baileys
│   │   │   ├── database.js              # Conexión MongoDB
│   │   │   ├── currencyAPI.js           # Sistema de APIs fallback
│   │   │   └── logger.js                # Sistema de logs
│   │   ├── handlers/
│   │   │   ├── messageHandler.js        # Procesa mensajes entrantes
│   │   │   ├── commandHandler.js        # Router de comandos
│   │   │   ├── eventHandler.js          # Eventos de conexión/desconexión
│   │   │   └── errorHandler.js          # Manejo global de errores
│   │   ├── commands/
│   │   │   ├── economy/
│   │   │   │   ├── work.js              # .work, .chambear, .trabajar
│   │   │   │   ├── balance.js           # .balance, .bal, .dinero
│   │   │   │   └── transfer.js          # .transfer, .enviar
│   │   │   ├── bank/
│   │   │   │   ├── deposit.js           # .deposit, .depositar
│   │   │   │   ├── withdraw.js          # .withdraw, .retirar, .sacar
│   │   │   │   ├── loan.js              # .prestame banco 500 dias 7
│   │   │   │   └── pay.js               # .pay, .pagar
│   │   │   ├── lending/
│   │   │   │   ├── lendUser.js          # .prestame @usuario 500 dias 5
│   │   │   │   ├── acceptLoan.js        # .aceptar, .accept
│   │   │   │   ├── rejectLoan.js        # .rechazar, .reject
│   │   │   │   └── payUser.js           # .pay @usuario 500
│   │   │   ├── credit/
│   │   │   │   ├── defaulters.js        # .morosos, .sbs, .infocrop
│   │   │   │   ├── creditHistory.js     # .historial, .creditos
│   │   │   │   └── creditScore.js       # .score, .calificacion
│   │   │   ├── shop/
│   │   │   │   ├── shop.js              # .shop, .tienda
│   │   │   │   ├── buy.js               # .buy, .comprar
│   │   │   │   ├── sell.js              # .sell, .vender
│   │   │   │   ├── inventory.js         # .inventory, .inv, .inventario
│   │   │   │   └── gift.js              # .gift, .regalar
│   │   │   ├── social/
│   │   │   │   ├── profile.js           # .me, .perfil
│   │   │   │   ├── leaderboard.js       # .ricos, .top, .ranking
│   │   │   │   └── rob.js               # .robar, .rob, .steal (solo billetera)
│   │   │   ├── games/
│   │   │   │   ├── coinflip.js          # .coinflip, .cara, .cruz
│   │   │   │   ├── dice.js              # .dice, .dado
│   │   │   │   └── roulette.js          # .roulette, .ruleta
│   │   │   ├── admin/
│   │   │   │   ├── init.js              # .init [país]
│   │   │   │   ├── config.js            # .config
│   │   │   │   └── reset.js             # .reset
│   │   │   └── utility/
│   │   │       ├── help.js              # .help, .ayuda, .comandos
│   │   │       └── ping.js              # .ping
│   │   ├── models/
│   │   │   ├── User.js                  # Schema de usuarios
│   │   │   ├── Group.js                 # Schema de grupos activos
│   │   │   ├── Bank.js                  # Schema del banco global
│   │   │   ├── Transaction.js           # Historial de transacciones
│   │   │   ├── Debt.js                  # Deudas por multas
│   │   │   ├── UserLoan.js              # Préstamos entre usuarios
│   │   │   └── CreditHistory.js         # Historial crediticio
│   │   ├── middleware/
│   │   │   ├── antiSpam.js              # Prevención de spam
│   │   │   ├── rateLimiter.js           # Límite de comandos por minuto
│   │   │   ├── groupValidator.js        # Validar grupo inicializado
│   │   │   ├── permissionCheck.js       # Verificar permisos admin
│   │   │   └── currencyConverter.js     # Conversión automática de divisas
│   │   ├── services/
│   │   │   ├── economyService.js        # Lógica económica compleja
│   │   │   ├── levelService.js          # Sistema de niveles y XP
│   │   │   ├── loanService.js           # Algoritmos de préstamos banco
│   │   │   ├── userLoanService.js       # Préstamos entre usuarios
│   │   │   ├── creditService.js         # Sistema de morosidad
│   │   │   ├── robService.js            # Sistema de robos (solo billetera)
│   │   │   ├── currencyService.js       # APIs de conversión con fallback
│   │   │   └── notificationService.js   # Notificaciones automáticas
│   │   └── utils/
│   │       ├── constants.js             # Constantes globales
│   │       ├── formatters.js            # Formateo de números con comas
│   │       ├── validators.js            # Validaciones comunes
│   │       └── helpers.js               # Funciones auxiliares
│   ├── web/                             # Aplicación Next.js
│   │   ├── app/
│   │   │   ├── profile/[userId]/[groupId]/
│   │   │   │   └── page.js              # Perfil específico por grupo
│   │   │   ├── leaderboard/[groupId]/
│   │   │   │   └── page.js              # Ranking por grupo
│   │   │   ├── credit/[groupId]/
│   │   │   │   └── page.js              # Reporte crediticio
│   │   │   └── games/
│   │   │       └── page.js              # Minijuegos web
│   │   ├── components/
│   │   │   ├── UserProfile.jsx          # Componente de perfil
│   │   │   ├── Leaderboard.jsx          # Tabla de rankings
│   │   │   ├── CreditReport.jsx         # Reporte de morosidad
│   │   │   └── GameInterface.jsx        # Interfaz de juegos
│   │   └── api/
│   │       ├── user/
│   │       │   └── [userId]/[groupId]/route.js
│   │       ├── leaderboard/
│   │       │   └── [groupId]/route.js
│   │       └── credit/
│   │           └── [groupId]/route.js
│   └── data/                            # Datos externalizados
│       ├── countries.json               # Países, monedas y códigos ISO
│       ├── jobs.json                    # Trabajos por nivel (múltiples por nivel)
│       ├── shopItems.json               # Items de la tienda con comida peruana
│       └── robberyMessages.json         # Mensajes de robo
├── .env                                 # Variables de entorno (API keys)
├── ecosystem.config.js                  # Configuración PM2
├── package.json
└── PRD.md                              # Este documento
```

---

## 🌍 Sistema de Inicialización por País con Conversión de Divisas

### Comando de Inicialización Mejorado

**Formato**: `.init [país]`
**Ejemplos**: 
- `.init` → Grupo con dólares por defecto (USD)
- `.init peru` → Grupo con soles peruanos (PEN)
- `.init argentina` → Grupo con pesos argentinos (ARS)
- `.init colombia` → Grupo con pesos colombianos (COP)

### Sistema de APIs de Conversión con Fallback

```javascript
const currencyAPIs = {
  primary: {
    name: "Frankfurter API",
    url: "https://api.frankfurter.app/latest",
    free: true,
    limit: "Sin límite",
    update: "Diario"
  },
  fallbacks: [
    {
      name: "ExchangeRate API", 
      url: "https://v6.exchangerate-api.com/v6/",
      free: "1,500 req/mes",
      update: "Cada hora"
    },
    {
      name: "CurrencyFreaks",
      url: "https://api.currencyfreaks.com/",
      free: "10,000 req/mes", 
      update: "Cada minuto"
    },
    {
      name: "Open Exchange Rates",
      url: "https://openexchangerates.org/api/",
      free: "1,000 req/mes",
      update: "Cada hora"
    }
  ]
};
```

### Configuración Automática por País

```json
{
  "default": {
    "currency": "USD",
    "symbol": "$",
    "flag": "🇺🇸", 
    "locale": "en-US",
    "initialLoan": 5000.00
  },
  "peru": {
    "currency": "PEN",
    "symbol": "S/",
    "flag": "🇵🇪",
    "locale": "es-PE", 
    "initialLoan": 5000.00
  },
  "argentina": {
    "currency": "ARS", 
    "symbol": "$",
    "flag": "🇦🇷",
    "locale": "es-AR",
    "initialLoan": 5000.00
  },
  "colombia": {
    "currency": "COP",
    "symbol": "$",
    "flag": "🇨🇴", 
    "locale": "es-CO",
    "initialLoan": 5000.00
  }
}
```

### Formateo de Números (Comas en lugar de Puntos)

```javascript
// ❌ INCORRECTO - Causa problemas en WhatsApp
const badFormat = "S/ 5.000,50"; // El punto se vuelve clickeable

// ✅ CORRECTO - Formato seguro para WhatsApp  
const goodFormat = "S/ 5 000,50"; // Espacio para miles, coma para decimales

// Función de formateo
function formatCurrency(amount, currency = "USD", symbol = "$") {
    // SIEMPRE usar espacio para miles, coma para decimale
  const formatted = new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount).replace(/\./g, ' '); // Reemplazar puntos por espacios
  
  return `${symbol} ${formatted}`;
}

// Ejemplos:
// formatCurrency(5000.50, "PEN", "S/") → "S/ 5 000,50"
// formatCurrency(1234567.89, "USD", "$") → "$ 1 234 567,89"
```

### Proceso de Inicialización Mejorado

1. **Validación de Admin**: Solo administradores pueden ejecutar `.init`
2. **Configuración de País**: Si no se especifica país, usa USD por defecto
3. **Conversión Automática**: Convierte valores base USD a moneda local
4. **Registro del Grupo**: Se crea entry en colección `ActiveGroups`
5. **Registro Masivo**: Todos los participantes del grupo se registran automáticamente  
6. **Sin Préstamo Automático**: Los usuarios deben solicitar su préstamo inicial manualmente

---

## 👤 Sistema de Usuarios con Historial Crediticio

### Modelo de Usuario Completo

```javascript
// Cada usuario tiene datos SEPARADOS por grupo
{
  userId: "51999999999@s.whatsapp.net",
  groupId: "120363024567890123@g.us", 
  name: "Pepito",
  
  // 💰 Sistema Económico
  wallet: 0,                    // Dinero en efectivo
  bank: 0,                      // Dinero en banco
  
  // 📊 Sistema de Progresión
  xp: 0,                        // Experiencia total
  level: 1,                     // Nivel actual (1-10)
  
  // 💼 Sistema Laboral
  lastWork: null,               // Timestamp último trabajo
  totalWorked: 0,               // Veces que ha trabajado
  
  // 🎒 Inventario
  inventory: [
    { itemId: "car", quantity: 1, purchaseDate: Date }
  ],
  
  // 🏦 Sistema Crediticio del Banco
  currentBankLoan: {
    amount: 0,                  // Monto actual del préstamo
    originalAmount: 0,          // Monto original
    interestRate: 5,            // % interés diario
    dueDate: null,              // Fecha límite de pago
    dailyInterest: 0,           // Interés acumulado por día
    daysOverdue: 0              // Días de atraso (para morosidad)
  },
  
  // 👥 Préstamos Entre Usuarios (como deudor)
  userDebts: [
    {
      lenderId: "51888888888@s.whatsapp.net", // Quien le prestó
      lenderName: "María",
      amount: 1000,              // Deuda actual
      originalAmount: 1000,      // Monto original
      interestRate: 0,           // Sin interés entre usuarios
      dueDate: Date,             // Fecha límite
      daysOverdue: 0,            // Días de atraso
      status: "active"           // active, paid, overdue
    }
  ],
  
  // 💸 Préstamos Otorgados (como prestamista)
  userLoans: [
    {
      borrowerId: "51777777777@s.whatsapp.net", // Quien le debe
      borrowerName: "Carlos",
      amount: 500,               // Cantidad prestada
      originalAmount: 500,
      dueDate: Date,
      daysOverdue: 0,
      status: "active"
    }
  ],
  
  // 🚨 Sistema de Deudas (Multas por robo)
  fines: {
    totalAmount: 0,             // Deuda total por multas
    history: [
      { amount: 500, reason: "Robo fallido", date: Date }
    ]
  },
  
  // 📈 Historial Crediticio
  creditHistory: {
    score: 100,                 // Puntaje crediticio (0-100)
    bankLoansCount: 0,          // Total préstamos bancarios
    bankLoansPaid: 0,           // Préstamos bancarios pagados a tiempo
    userLoansCount: 0,          // Total préstamos entre usuarios
    userLoansPaid: 0,           // Préstamos entre usuarios pagados
    defaultedLoans: 0,          // Préstamos en mora
    isDefaulter: false,         // ¿Está en InfoCorp?
    lastDefaultDate: null       // Última vez en mora
  },
  
  // 📊 Estadísticas
  stats: {
    totalEarned: 0,
    totalSpent: 0,
    successfulRobs: 0,
    failedRobs: 0,
    timesRobbed: 0
  }
}
```

---

## 💼 Sistema de Trabajos Dinámico Múltiple

### Estructura de Trabajos JSON (Múltiples por Nivel)

```json
{
  "level1": [
    {
      "id": "qr_reader",
      "name": "Lector de QR",
      "description": "🎟️ Escaneaste los tickets de los ravers emocionados por entrar",
      "minSalary": 80,
      "maxSalary": 120,
      "xpGain": 10,
      "rarity": "common"
    },
    {
      "id": "cleaner",
      "name": "Staff de Limpieza", 
      "description": "🧹 Dejaste impecable el venue después de una noche de locura",
      "minSalary": 90,
      "maxSalary": 130,
      "xpGain": 10,
      "rarity": "common"
    },
    {
      "id": "flyer_distributor",
      "name": "Repartidor de Flyers",
      "description": "📄 Promoviste los próximos eventos en las calles de la ciudad",
      "minSalary": 70,
      "maxSalary": 110, 
      "xpGain": 10,
      "rarity": "common"
    },
    {
      "id": "wristband_seller",
      "name": "Vendedor de Pulseras",
      "description": "📿 Vendiste pulseras rave a los asistentes más entusiastas",
      "minSalary": 85,
      "maxSalary": 125,
      "xpGain": 10,
      "rarity": "common"
    }
  ],
  "level2": [
    {
      "id": "security_ultra",
      "name": "Seguridad Ultra Perú",
      "description": "🕶️ Aseguraste que todo fluya sin problemas en el ingreso del evento",
      "minSalary": 120,
      "maxSalary": 160,
      "xpGain": 15,
      "rarity": "uncommon"
    },
    {
      "id": "sound_tech",
      "name": "Técnico de Sonido",
      "description": "🎛️ Ajustaste los niveles para que los drops suenen perfectos",
      "minSalary": 140,
      "maxSalary": 180,
      "xpGain": 15,
      "rarity": "uncommon"
    },
    {
      "id": "bartender",
      "name": "Bartender VIP",
      "description": "🍹 Preparaste cocteles premium en la zona VIP del festival",
      "minSalary": 150,
      "maxSalary": 190,
      "xpGain": 15,
      "rarity": "uncommon"
    }
  ],
  "level3": [
    {
      "id": "stage_manager",
      "name": "Manager de Escenario",
      "description": "🎤 Coordinaste las presentaciones de los DJs principales",
      "minSalary": 200,
      "maxSalary": 250,
      "xpGain": 20,
      "rarity": "rare"
    },
    {
      "id": "vip_host",
      "name": "Host VIP",
      "description": "🍾 Atendiste a celebridades y personalidades en el área VIP",
      "minSalary": 220,
      "maxSalary": 280,
      "xpGain": 20,
      "rarity": "rare"
    }
  ]
}
```

### Lógica de Selección Aleatoria de Trabajos

```javascript
async function selectRandomJob(userLevel) {
  const availableJobs = jobsData[`level${userLevel}`] || jobsData.level1;
  const randomJob = availableJobs[Math.floor(Math.random() * availableJobs.length)];
  
  // Calcular salario aleatorio dentro del rango
  const salary = Math.floor(Math.random() * (randomJob.maxSalary - randomJob.minSalary + 1)) + randomJob.minSalary;
  
  return {
    ...randomJob,
    salary: salary
  };
}


``` ### COOLDOWNS
```javascript
const COOLDOWNS = {
  work: (level) => {
    const cooldowns = { 1: 45, 2: 60, 3: 90, 4: 120, 5: 150, 6: 180, 7: 210, 8: 240, 9: 270, 10: 300 };
    return cooldowns[level] * 60 * 1000; // Convertir a milisegundos
  },
  rob: 6 * 60 * 60 * 1000,      // 6 horas
  loan: 24 * 60 * 60 * 1000,    // 24 horas
  shop: 0,                       // Sin cooldown
  balance: 0,                    // Sin cooldown
  transfer: 30 * 1000,          // 30 segundos
  deposit: 10 * 1000,           // 10 segundos
  withdraw: 10 * 1000           // 10 segundos
};
---


---

## 🏦 Sistema Bancario con Evaluación Crediticia

### Préstamos del Banco con Historial Crediticio

**Comando**: `.prestame banco <cantidad> dias <días>`
**Ejemplo**: `.prestame banco 1000 dias 7`

```javascript
// Algoritmo de evaluación crediticia para préstamos bancarios
const evaluateBankLoan = (user, requestedAmount, days) => {
  let creditScore = user.creditHistory.score;
  let maxLoanAmount = 0;
  let interestRate = 10; // % diario base
  
  // Factores positivos
  const levelBonus = user.level * 1000;
  const xpBonus = Math.floor(user.xp / 10);
  const goodPaymentBonus = user.creditHistory.bankLoansPaid * 500;
  const assetValue = calculateInventoryValue(user.inventory) * 0.7;
  
  // Factores negativos
  const defaultPenalty = user.creditHistory.defaultedLoans * 2000;
  const activeLoanPenalty = user.currentBankLoan.amount > 0 ? 1000 : 0;
  
  // Cálculo del monto máximo
  maxLoanAmount = levelBonus + xpBonus + goodPaymentBonus + assetValue - defaultPenalty - activeLoanPenalty;
  
  // Ajustar tasa de interés según historial
  if (user.creditHistory.isDefaulter) {
    interestRate = 15; // Morosos pagan más
  } else if (user.creditHistory.bankLoansPaid >= 3) {
    interestRate = 5; // Buenos pagadores pagan menos
  }
  
  // Validaciones
  if (days > 10) return { approved: false, reason: "Máximo 10 días" };
  if (requestedAmount > maxLoanAmount) return { approved: false, reason: `Máximo aprobado: ${formatCurrency(maxLoanAmount)}` };
  if (user.currentBankLoan.amount > 0) return { approved: false, reason: "Ya tienes un préstamo activo" };
  
  return {
    approved: true,
    amount: requestedAmount,
    interestRate: interestRate,
    totalInterest: Math.ceil((requestedAmount * interestRate * days) / 100),
    totalPayment: requestedAmount + Math.ceil((requestedAmount * interestRate * days) / 100),
    dueDate: new Date(Date.now() + (days * 24 * 60 * 60 * 1000))
  };
};
```

---

## 👥 Sistema de Préstamos Entre Usuarios

### Solicitar Préstamo a Usuario

**Comando**: `.prestame @usuario <cantidad> dias <días>`
**Ejemplo**: `.prestame @maría 500 dias 5`

**Limitaciones**:
- Máximo **10 días** de plazo
- Sin intereses entre usuarios
- El prestamista decide si acepta o rechaza
- Ambos usuarios deben estar en el mismo grupo

### Flujo de Préstamos Entre Usuarios

```javascript
// 1. Pepito solicita préstamo
// .prestame @maría 500 dias 5

// 2. Sistema valida la solicitud
const validateUserLoan = (borrower, lender, amount, days) => {
  if (days > 10) return { valid: false, reason: "❌ Máximo 10 días de plazo" };
  if (amount > lender.wallet + lender.bank) return { valid: false, reason: "❌ @usuario no tiene suficiente dinero" };
  if (borrower.userId === lender.userId) return { valid: false, reason: "❌ No puedes prestarte a ti mismo" };
  
  return { valid: true };
};

// 3. Se envía notificación al prestamista
const loanRequest = {
  borrowerId: borrower.userId,
  borrowerName: borrower.name,
  lenderId: lender.userId,
  amount: amount,
  days: days,
  dueDate: new Date(Date.now() + (days * 24 * 60 * 60 * 1000)),
  status: "pending",
  expiresAt: new Date(Date.now() + (5 * 60 * 1000)) // 5 minutos para responder
};

// 4. Prestamista acepta o rechaza
// .aceptar o .rechazar
```

### Respuesta del Sistema para Préstamos Entre Usuarios

```
Pepito: .prestame @maría 500 dias 5

Bot: 💸 *Solicitud de Préstamo Enviada*

👤 Solicitante: Pepito
💰 Monto: S/ 500,00
📅 Plazo: 5 días (hasta 04/08/2025)
💳 Sin intereses (préstamo entre usuarios)

@María, responde:
✅ *.aceptar* - para aprobar el préstamo
❌ *.rechazar* - para rechazar la solicitud

⏰ Tienes 5 minutos para responder

María: .aceptar

Bot: ✅ *Préstamo Aprobado*

💸 S/ 500,00 transferidos a Pepito
📅 Fecha de pago: 04/08/2025
📋 Pepito debe pagar con: *.pay @maría 500*

💰 Tu saldo actual: S/ 1 500,00
```

---

## 🚨 Sistema de Morosidad InfoCorp/SBS

### Comandos de Consulta de Morosidad

**Comandos**: `.morosos`, `.sbs`, `.infocrop`
**Funcionalidad**: Muestra lista de usuarios con deudas vencidas

### Criterios para Ser Moroso

Un usuario se convierte en **moroso** cuando:
1. **Préstamo bancario** vencido por más de 3 días
2. **Préstamo entre usuarios** vencido por más de 2 días  
3. **Multas por robo** no pagadas por más de 7 días

### Sistema Automático de Morosidad

```javascript
// Función que se ejecuta diariamente
const checkDefaulters = async () => {
  const users = await User.find({});
  const today = new Date();
  
  for (const user of users) {
    let isDefaulter = false;
    let reasons = [];
    
    // Verificar préstamo bancario
    if (user.currentBankLoan.amount > 0 && user.currentBankLoan.dueDate < today) {
      const daysOverdue = Math.floor((today - user.currentBankLoan.dueDate) / (1000 * 60 * 60 * 24));
      if (daysOverdue >= 3) {
        isDefaulter = true;
        reasons.push(`Préstamo bancario vencido (${daysOverdue} días)`);
        user.currentBankLoan.daysOverdue = daysOverdue;
      }
    }
    
    // Verificar préstamos entre usuarios
    for (const debt of user.userDebts) {
      if (debt.status === "active" && debt.dueDate < today) {
        const daysOverdue = Math.floor((today - debt.dueDate) / (1000 * 60 * 60 * 24));
        if (daysOverdue >= 2) {
          isDefaulter = true;
          reasons.push(`Deuda con ${debt.lenderName} vencida (${daysOverdue} días)`);
          debt.daysOverdue = daysOverdue;
          debt.status = "overdue";
        }
      }
    }
    
    // Verificar multas por robo
    if (user.fines.totalAmount > 0) {
      const lastFine = user.fines.history[user.fines.history.length - 1];
      const daysSinceFine = Math.floor((today - lastFine.date) / (1000 * 60 * 60 * 24));
      if (daysSinceFine >= 7) {
        isDefaulter = true;
        reasons.push(`Multas sin pagar (${daysSinceFine} días)`);
      }
    }
    
    // Actualizar estado de morosidad... etc>

// Sistema de intereses compuestos para préstamos bancarios
const calculateDailyInterest = (currentLoan) => {
  const today = new Date();
  const daysSinceLoan = Math.floor((today - currentLoan.startDate) / (1000 * 60 * 60 * 24));
  
  if (daysSinceLoan <= currentLoan.gracePeriod) {
    return 0; // Sin interés durante período de gracia
  }
  
  // Interés compuesto diario después del período de gracia
  const daysWithInterest = daysSinceLoan - currentLoan.gracePeriod;
  const dailyRate = currentLoan.interestRate / 100;
  const compoundInterest = currentLoan.originalAmount * Math.pow(1 + dailyRate, daysWithInterest) - currentLoan.originalAmount;
  
  return Math.floor(compoundInterest);
};



 
## 🚨 Continuación del Sistema de Morosidad InfoCorp/SBS

```javascript
    // Actualizar estado de morosidad (continuación)
    if (isDefaulter) {
      user.creditHistory.isDefaulter = true;
      user.creditHistory.lastDefaultDate = today;
      user.creditHistory.defaultedLoans += 1;
      user.creditHistory.score = Math.max(0, user.creditHistory.score - 20);
      
      await user.save();
      
      // Notificar al usuario sobre su estado de morosidad
      await notificationService.sendDefaulterNotification(user, reasons);
    }
  }
};
```

### Respuesta del Comando .morosos/.sbs/.infocrop

```
Admin: .morosos

Bot: 📋 *Reporte InfoCorp - Argentina* 🇦🇷

🚨 *USUARIOS EN MORA*

1. 🔴 **Carlos** (Nivel 2)
   💸 Préstamo bancario: S/ 2 500,00 (7 días vencido)
   📊 Score crediticio: 45/100
   
2. 🔴 **Ana** (Nivel 1)  
   👥 Deuda con María: S/ 800,00 (3 días vencido)
   🚨 Multas pendientes: S/ 320,00 (12 días)
   📊 Score crediticio: 20/100

3. 🟡 **Luis** (Nivel 3)
   🚨 Multas pendientes: S/ 150,00 (8 días)
   📊 Score crediticio: 75/100

💡 *Total usuarios en mora: 3/25*
🏦 *Dinero en riesgo: S/ 3 770,00*

⚠️ Los usuarios morosos no pueden:
❌ Solicitar nuevos préstamos
❌ Recibir préstamos de otros usuarios  
❌ Participar en juegos de apuestas
```

### Salir de InfoCorp

Un usuario **sale automáticamente** de la lista de morosos cuando:
- Paga **todas** sus deudas bancarias
- Paga **todas** sus deudas con otros usuarios
- Paga **todas** sus multas por robo
- Su `creditHistory.isDefaulter` se cambia a `false`

---

## 🦹 Sistema de Robos Mejorado (Solo Billetera)

### Restricción Importante: Solo Robar de Billetera

```javascript
// ❌ ANTES: Se podía robar del total (billetera + banco)
const oldRobLogic = target.wallet + target.bank;

// ✅ AHORA: Solo se puede robar de la billetera
const newRobLogic = target.wallet; // Solo dinero en efectivo
```

### Comando de Robo Actualizado

**Comando**: `.robar @usuario`, `.rob @usuario`, `.steal @usuario`

**Restricciones**:
- Solo se puede robar dinero de la **billetera** (no del banco)
- Si el usuario no tiene dinero en billetera, el robo falla automáticamente
- Los morosos **no pueden robar** a otros usuarios

### Mecánica de Robos Actualizada

```javascript
const robUser = async (robber, target) => {
  // Validaciones previas
  if (robber.creditHistory.isDefaulter) {
    return { success: false, message: "❌ Los usuarios morosos no pueden robar" };
  }
  
  if (target.wallet <= 0) {
    return { success: false, message: "❌ @usuario no tiene dinero en su billetera" };
  }
  
  // Calcular probabilidad de éxito
  const baseSuccess = 40;
  const levelDifference = (robber.level - target.level) * 5;
  const targetMoneyFactor = target.wallet > 1000 ? -5 : 0; // Más difícil robar a ricos
  
  const successChance = Math.max(10, Math.min(70, baseSuccess + levelDifference + targetMoneyFactor));
  const isSuccessful = Math.random() * 100 < successChance;
  
  if (isSuccessful) {
    // Robo exitoso
    const stolenPercentage = Math.random() * 0.3 + 0.1; // 10% a 40%
    const stolenAmount = Math.floor(target.wallet * stolenPercentage);
    
    target.wallet -= stolenAmount;
    robber.wallet += stolenAmount;
    
    robber.xp += 25;
    robber.stats.successfulRobs += 1;
    target.stats.timesRobbed += 1;
    
    return {
      success: true,
      amount: stolenAmount,
      message: `💰 *Robo Exitoso*\n\n🥷 Robaste S/ ${formatCurrency(stolenAmount)} de @${target.name}\n⭐ +25 XP ganados`
    };
    
  } else {
    // Robo fallido - multa
    const fineAmount = Math.floor(target.wallet * 0.15) + 300; // 15% + multa base
    
    robber.fines.totalAmount += fineAmount;
    robber.fines.history.push({
      amount: fineAmount,
      reason: `Intento de robo fallido a ${target.name}`,
      date: new Date()
    });
    
    robber.stats.failedRobs += 1;
    
    return {
      success: false,
      fine: fineAmount,
      message: `🚨 *Robo Fallido*\n\n👮‍♂️ ¡La policía te atrapó!\n💸 Multa: S/ ${formatCurrency(fineAmount)}\n⚠️ No podrás depositar hasta pagar esta multa`
    };
  }
};
```

---

## 💳 Sistema de Pagos Unificado

### Comando .pay/.pagar Mejorado

**Formatos soportados**:
- `.pay banco 1000` → Pagar préstamo bancario
- `.pay @usuario 500` → Pagar deuda a otro usuario
- `.pagar banco all` → Pagar todo el préstamo bancario
- `.pagar @maría 300` → Pagar parte de deuda a María

### Lógica de Pagos

```javascript
const processPayment = async (payer, target, amount) => {
  if (target === "banco") {
    // Pago a préstamo bancario
    if (payer.currentBankLoan.amount <= 0) {
      return { success: false, message: "❌ No tienes préstamos bancarios activos" };
    }
    
    const totalDebt = payer.currentBankLoan.amount + payer.currentBankLoan.dailyInterest;
    const paymentAmount = amount === "all" ? totalDebt : Math.min(amount, totalDebt);
    
    if (payer.wallet < paymentAmount) {
      return { success: false, message: `❌ Necesitas S/ ${formatCurrency(paymentAmount)} en tu billetera` };
    }
    
    payer.wallet -= paymentAmount;
    payer.currentBankLoan.amount = Math.max(0, payer.currentBankLoan.amount - paymentAmount);
    
    // Si pagó completamente
    if (payer.currentBankLoan.amount <= 0) {
      payer.creditHistory.bankLoansPaid += 1;
      payer.creditHistory.score = Math.min(100, payer.creditHistory.score + 10);
      payer.currentBankLoan = {}; // Limpiar préstamo
      
      // Salir de morosidad si corresponde
      if (payer.fines.totalAmount <= 0 && payer.userDebts.length === 0) {
        payer.creditHistory.isDefaulter = false;
      }
    }
    
    return {
      success: true,
      message: `✅ *Pago Bancario Exitoso*\n\n💰 Pagaste: S/ ${formatCurrency(paymentAmount)}\n🏦 Deuda restante: S/ ${formatCurrency(payer.currentBankLoan.amount)}\n⭐ +25 XP por pago responsable`
    };
    
  } else {
    // Pago a otro usuario
    const debt = payer.userDebts.find(d => d.lenderId === target.userId && d.status === "active");
    if (!debt) {
      return { success: false, message: `❌ No tienes deudas activas con @${target.name}` };
    }
    
    const paymentAmount = Math.min(amount, debt.amount);
    
    if (payer.wallet < paymentAmount) {
      return { success: false, message: `❌ Necesitas S/ ${formatCurrency(paymentAmount)} en tu billetera` };
    }
    
    payer.wallet -= paymentAmount;
    target.wallet += paymentAmount;
    debt.amount -= paymentAmount;
    
    // Si pagó completamente
    if (debt.amount <= 0) {
      debt.status = "paid";
      payer.creditHistory.userLoansPaid += 1;
      payer.creditHistory.score = Math.min(100, payer.creditHistory.score + 5);
    }
    
    return {
      success: true,
      message: `✅ *Pago a Usuario Exitoso*\n\n💰 Pagaste S/ ${formatCurrency(paymentAmount)} a @${target.name}\n💳 Deuda restante: S/ ${formatCurrency(debt.amount)}`
    };
  }
};
```

---

## 🛒 Sistema de Tienda con Comida Peruana

### Estructura de Tienda Actualizada

```json
{
  "food_drinks": {
    "name": "🍽️ Comida y Bebidas",
    "emoji": "🍽️",
    "items": {
      "ceviche": {
        "id": "ceviche",
        "name": "Ceviche",
        "description": "Fresco y picante, como debe ser 🐟",
        "price": 25.00,
        "emoji": "🐟",
        "category": "Comida Peruana",
        "type": "food",
        "rarity": "common",
        "resaleValue": 0,
        "levelRequired": 1,
        "aliases": ["ceviche"],
        "effects": { "hunger": 18, "thirst": 5, "stress": -1 }
      },
      "lomo_saltado": {
        "id": "lomo_saltado", 
        "name": "Lomo Saltado",
        "description": "Un clásico que nunca falla 🥩",
        "price": 28.00,
        "emoji": "🥩",
        "category": "Comida Peruana",
        "type": "food",
        "rarity": "common",
        "resaleValue": 0,
        "levelRequired": 1,
        "aliases": ["lomo", "lomo saltado"],
        "effects": { "hunger": 28, "thirst": 0, "stress": -4 }
      },
      "aji_gallina": {
        "id": "aji_gallina",
        "name": "Ají de Gallina", 
        "description": "Cremoso y delicioso ají de gallina 🍛",
        "price": 22.00,
        "emoji": "🍛",
        "category": "Comida Peruana",
        "type": "food",
        "rarity": "common", 
        "resaleValue": 0,
        "levelRequired": 1,
        "aliases": ["aji de gallina", "aji"],
        "effects": { "hunger": 22, "thirst": 0, "stress": -3 }
      },
      "pollo_brasa": {
        "id": "pollo_brasa",
        "name": "1/4 de Pollo a la Brasa",
        "description": "Un clásico peruano para el bajón 🍗",
        "price": 18.00,
        "emoji": "🍗",
        "category": "Comida Peruana",
        "type": "food",
        "rarity": "common",
        "resaleValue": 0,
        "levelRequired": 1,
        "aliases": ["pollo", "1/4 de pollo", "pollo a la brasa"],
        "effects": { "hunger": 35, "thirst": 0, "stress": -5 }
      },
      "arroz_chaufa": {
        "id": "arroz_chaufa",
        "name": "Arroz Chaufa",
        "description": "Clásico arroz chaufa para el bajón 🍚",
        "price": 20.00,
        "emoji": "🍚", 
        "category": "Comida Peruana",
        "type": "food",
        "rarity": "common",
        "resaleValue": 0,
        "levelRequired": 1,
        "aliases": ["chaufa", "arroz chaufa"],
        "effects": { "hunger": 20, "thirst": 0, "stress": -2 }
      },
      "caldo_gallina": {
        "id": "caldo_gallina",
        "name": "Caldo de Gallina",
        "description": "El levanta muertos por excelencia 🍜",
        "price": 15.00,
        "emoji": "🍜",
        "category": "Comida Peruana", 
        "type": "food",
        "rarity": "common",
        "resaleValue": 0,
        "levelRequired": 1,
        "aliases": ["caldo"],
        "effects": { "hunger": 25, "thirst": 10, "stress": -5 }
      },
      "inca_kola": {
        "id": "inca_kola",
        "name": "Inca Kola",
        "description": "La bebida de sabor nacional 🥤",
        "price": 4.00,
        "emoji": "🥤",
        "category": "Bebidas Peruanas",
        "type": "drink",
        "rarity": "common",
        "resaleValue": 0,
        "levelRequired": 1,
        "aliases": ["inca", "inka cola", "inca cola"],
        "effects": { "hunger": 2, "thirst": 15, "stress": -2 }
      },
      "chicha_morada": {
        "id": "chicha_morada",
        "name": "Chicha Morada", 
        "description": "Refrescante y tradicional 🥤",
        "price": 6.00,
        "emoji": "🥤",
        "category": "Bebidas Peruanas",
        "type": "drink",
        "rarity": "common",
        "resaleValue": 0,
        "levelRequired": 1,
        "aliases": ["chicha"],
        "effects": { "hunger": 1, "thirst": 18, "stress": -2 }
      },
      "pisco_sour": {
        "id": "pisco_sour",
        "name": "Pisco Sour",
        "description": "El cóctel bandera del Perú 🍸",
        "price": 15.00,
        "emoji": "🍸",
        "category": "Bebidas Peruanas",
        "type": "drink",
        "rarity": "uncommon",
        "resaleValue": 0,
        "levelRequired": 2,
        "aliases": ["pisco", "pisco sour"],
        "effects": { "hunger": 2, "thirst": 15, "stress": -15 }
      },
      "cerveza": {
        "id": "cerveza",
        "name": "Cerveza Heladita",
        "description": "Ideal para refrescarse 🥵🍺",
        "price": 8.00,
        "emoji": "🍺",
        "category": "Bebidas",
        "type": "drink",
        "rarity": "common",
        "resaleValue": 0,
        "levelRequired": 1,
        "aliases": ["cerveza", "chela", "pilsen", "cristal"],
        "effects": { "hunger": 5, "thirst": 25, "stress": -10 }
      }
    }
  },
  "vehicles": {
    "name": "🚗 Vehículos",
    "emoji": "🚗",
    "items": {
      "bicycle": {
        "id": "bicycle",
        "name": "Bicicleta",
        "description": "Perfecta para moverte por la ciudad rave 🚲",
        "price": 800.00,
        "emoji": "🚲",
        "rarity": "common",
        "resaleValue": 400.00,
        "levelRequired": 1
      },
      "mototaxi": {
        "id": "mototaxi",
        "name": "Mototaxi",
        "description": "Transporte urbano económico 🛺",
        "price": 4500.00,
        "emoji": "🛺",
        "rarity": "uncommon",
        "resaleValue": 2700.00,
        "levelRequired": 2
      },
      "chevrolet": {
        "id": "chevrolet",
        "name": "Chevrolet (Sapito)",
        "description": "Compacto y con mucho estilo 🚗",
        "price": 8000.00,
        "emoji": "🚗",
        "rarity": "rare",
        "resaleValue": 5600.00,
        "levelRequired": 3
      },
      "tesla": {
        "id": "tesla",
        "name": "Auto Tesla Model 3",
        "description": "Eléctrico, rápido y ecológico ⚡",
        "price": 129000.00,
        "emoji": "⚡",
        "rarity": "legendary",
        "resaleValue": 90300.00,
        "levelRequired": 5
      }
    }
  },
  "real_estate": {
    "name": "🏠 Bienes Raíces",
    "emoji": "🏠",
    "items": {
      "casa_sjl": {
        "id": "casa_sjl",
        "name": "Casa en SJL",
        "description": "Casa de esteras en SJL 🏠",
        "price": 10000.00,
        "emoji": "🏠",
        "rarity": "common",
        "resaleValue": 7000.00,
        "levelRequired": 3
      },
      "casa_san_isidro": {
        "id": "casa_san_isidro", 
        "name": "Casa en San Isidro",
        "description": "Zona exclusiva de Lima 🏡",
        "price": 500000.00,
        "emoji": "🏡",
        "rarity": "legendary",
        "resaleValue": 400000.00,
        "levelRequired": 8
      }
    }
  },
  "event_tickets": {
    "name": "🎫 Tickets de Eventos",
    "emoji": "🎫",
    "items": {
      "ultra_peru_ga": {
        "id": "ultra_peru_ga",
        "name": "Ticket GA Ultra Perú 2026",
        "description": "Entrada general para Ultra Perú (1 día) 🎟️",
        "price": 190.00,
        "emoji": "🎟️",
        "rarity": "uncommon",
        "resaleValue": 0,
        "levelRequired": 1
      },
      "ultra_peru_vip": {
        "id": "ultra_peru_vip",
        "name": "Pase VIP Ultra Perú 2026", 
        "description": "Acceso VIP a Ultra Perú 2026 🎟️",
        "price": 350.00,
        "emoji": "🎟️",
        "rarity": "rare",
        "resaleValue": 0,
        "levelRequired": 2
      },
      "david_guetta": {
        "id": "david_guetta",
        "name": "Ticket David Guetta Lima",
        "description": "Ticket para el show de David Guetta en Lima 🎫",
        "price": 287.00,
        "emoji": "🎫",
        "rarity": "rare",
        "resaleValue": 0,
        "levelRequired": 2
      }
    }
  }
}
```

---

## 📊 Sistema de Niveles y XP Actualizado

### Ganancia de XP Actualizada

- **`.work`**: +10 XP por trabajo exitoso
- **`.rob` exitoso**: +25 XP
- **`.loan` pagado a tiempo**: +25 XP  
- **Préstamo entre usuarios pagado**: +15 XP
- **Compras en tienda**: +5 XP por cada S/ 1 000,00 gastados
- **Salir de morosidad**: +50 XP (bonus por rehabilitación)

### Niveles y Cooldowns

```javascript
const levelSystem = {
  1: { xpRequired: 0, xpNext: 100, workCooldown: 45, maxJobs: 4 },
  2: { xpRequired: 100, xpNext: 300, workCooldown: 60, maxJobs: 3 },
  3: { xpRequired: 300, xpNext: 600, workCooldown: 90, maxJobs: 2 },
  4: { xpRequired: 600, xpNext: 1000, workCooldown: 120, maxJobs: 2 },
  5: { xpRequired: 1000, xpNext: 1500, workCooldown: 150, maxJobs: 2 },
  6: { xpRequired: 1500, xpNext: 2100, workCooldown: 180, maxJobs: 1 },
  7: { xpRequired: 2100, xpNext: 2800, workCooldown: 210, maxJobs: 1 },
  8: { xpRequired: 2800, xpNext: 3600, workCooldown: 240, maxJobs: 1 },
  9: { xpRequired: 3600, xpNext: 4500, workCooldown: 270, maxJobs: 1 },
  10: { xpRequired: 4500, xpNext: null, workCooldown: 300, maxJobs: 1 }
};
```

---

## 💰 Flujo Completo Actualizado: Ejemplo con Pepito

### Escenario: Pepito en Grupo Peruano con Morosidad

#### 1. Admin Inicializa el Bot en Perú

```
Admin: .init peru

Bot: ✅ *RaveHub Bot Inicializado* 🇵🇪

💰 *Moneda*: Soles Peruanos (PEN)
💱 *Símbolo*: S/
👥 *Usuarios registrados*: 25 
🎁 Cada usuario puede solicitar S/ 5 000,00 de préstamo inicial
🏦 *Ravehub Bank capital*: S/ 1 000 000,00

_Usa_ *.help* _para ver todos los comandos._

💡 *Conversión automática USD → PEN activada*
📊 *Tasa actual*: $1 USD = S/ 3,75 PEN

[DEBUG] [GRUPO: Rave Perú] [ADMIN: Carlos] COMANDO: ".init peru" - EJECUTADO ✅
```

#### 2. Pepito Solicita Préstamo Bancario

```
Pepito: .prestame banco 2000 dias 7

Bot: 🏦 *Análisis de Préstamo Bancario*

👤 *Solicitante*: Pepito
💰 *Monto solicitado*: S/ 2 000,00  
📅 *Plazo*: 7 días
📊 *Score crediticio*: 100/100 (sin historial)

✅ *PRÉSTAMO APROBADO*
💳 *Interés*: 10% diario
📈 *Interés total*: S/ 1 400,00 (7 días)
💸 *Total a pagar*: S/ 3 400,00
📅 *Vencimiento*: 06/08/2025

¿Confirmas? Responde *.confirmar* en 60 segundos.

Pepito: .confirmar

Bot: ✅ *Préstamo Bancario Otorgado*

💵 S/ 2 000,00 depositados en tu billetera
🏦 *Ravehub Bank capital*: S/ 998 000,00
⏰ *Vencimiento*: 06/08/2025 (7 días)
📊 *Tu score crediticio*: 100/100

_Recuerda pagar a tiempo para mantener buen historial_

[DEBUG] [GRUPO: Rave Perú] [USUARIO: Pepito] PRÉSTAMO BANCARIO OTORGADO: S/ 2 000,00 ✅
```

#### 3. Pepito Solicita Préstamo a Usuario

```
Pepito: .prestame @maría 800 dias 5

Bot: 💸 *Solicitud de Préstamo Enviada*

👤 *Solicitante*: Pepito  
💰 *Monto*: S/ 800,00
📅 *Plazo*: 5 días (hasta 04/08/2025)
💳 *Sin intereses* (préstamo entre usuarios)

@María, responde:
✅ *.aceptar* - para aprobar el préstamo
❌ *.rechazar* - para rechazar la solicitud

⏰ Tienes 5 minutos para responder

María: .aceptar

Bot: ✅ *Préstamo Entre Usuarios Aprobado*

💸 S/ 800,00 transferidos a Pepito
📅 *Fecha de pago*: 04/08/2025
📋 Pepito debe pagar con: *.pay @maría 800*

💰 *Saldo de María*: S/ 1 200,00
💰 *Saldo de Pepito*: S/ 2 800,00

[DEBUG] [GRUPO: Rave Perú] [USUARIO: Pepito] PRÉSTAMO USUARIO APROBADO: S/ 800,00 ✅
```

#### 4. Pepito No Paga a Tiempo (Se Convierte en Moroso)

```
// 6 días después... Sistema automático detecta morosidad

Bot: 🚨 *Notificación de Morosidad*

@Pepito, has sido reportado a *InfoCorp* por:
❌ Deuda con @María vencida (3 días de atraso)
❌ Préstamo bancario próximo a vencer (1 día restante)

📊 *Tu score crediticio*: 75/100 → 55/100
⚠️ *Restricciones activas*:
❌ No puedes solicitar nuevos préstamos
❌ No puedes recibir préstamos de otros usuarios
❌ No puedes participar en juegos de apuestas

💡 Paga tus deudas para salir de InfoCorp

[DEBUG] [SISTEMA] [USUARIO: Pepito] AGREGADO A INFOCORP - DEUDA USUARIO VENCIDA ✅
```

#### 5. Admin Consulta Lista de Morosos

```
Admin: .sbs

Bot: 📋 *Reporte InfoCorp - Perú* 🇵🇪

🚨 *USUARIOS EN MORA*

1. 🔴 **Pepito** (Nivel 2)
   👥 Deuda con María: S/ 800,00 (3 días vencido)
   🏦 Préstamo bancario: S/ 3 400,00 (vence en 1 día)
   📊 Score crediticio: 55/100
   
2. 🔴 **Carlos** (Nivel 1)
   🚨 Multas pendientes: S/ 450,00 (8 días)
   📊 Score crediticio: 30/100

💡 *Total usuarios en mora*: 2/25
🏦 *Dinero en riesgo*: S/ 4 650,00

*Estadísticas del grupo*:
📈 *Actividad económica*: Media
💳 *Préstamos activos*: 12
🎯 *Tasa de morosidad*: 8%

[DEBUG] [GRUPO: Rave Perú] [ADMIN: Carlos] COMANDO: ".sbs" - REPORTE MOSTRADO ✅
```

#### 6. Pepito Paga Sus Deudas y Sale de InfoCorp

```
Pepito: .pay @maría 800

Bot: ✅ *Pago a Usuario Exitoso*

💰 Pagaste S/ 800,00 a @María
💳 *Deuda saldada completamente*
⭐ +15 XP por pago responsable
📊 *Score crediticio*: 55/100 → 65/100

💰 *Tu saldo actual*: S/ 2 000,00
📋 *Deudas restantes*: Préstamo bancario S/ 3 400,00

Pepito: .pay banco all

Bot: ✅ *Pago Bancario Exitoso*

💰 Pagaste S/ 3 400,00 al banco
🏦 *Préstamo saldado completamente*
⭐ +25 XP por pago responsable  
📊 *Score crediticio*: 65/100 → 80/100

🎉 *¡Felicidades!* Has salido de InfoCorp
✅ Todas tus restricciones han sido levantadas

💰 *Tu saldo actual*: S/ 0,00
🏦 *Sin deudas activas*

[DEBUG] [GRUPO: Rave Perú] [USUARIO: Pepito] SALIÓ DE INFOCORP - DEUDAS PAGADAS ✅
```

#### 7. Pepito Trabaja con Selección Aleatoria

```
Pepito: .work

Bot: 💼 *Trabajo Completado*

👨‍💼 Trabajaste como: **Técnico de Sonido** 🎛️
📝 Ajustaste los niveles para que los drops suenen perfectos
💰 *Pago*: S/ 165,00
⭐ *XP ganado*: +15 (Total: 155 XP)

⏰ *Próximo trabajo disponible en 60 minutos*

[DEBUG] [GRUPO: Rave Perú] [USUARIO: Pepito] TRABAJO NIVEL 2 ALEATORIO: sound_tech ✅

// 1 hora después...
Pepito: .chambear

Bot: 💼 *Trabajo Completado*

👨‍💼 Trabajaste como: **Bartender VIP** 🍹
📝 Preparaste cocteles premium en la zona VIP del festival
💰 *Pago*: S/ 175,00
⭐ *XP ganado*: +15 (Total: 170 XP)

⏰ *Próximo trabajo disponible en 60 minutos*

[DEBUG] [GRUPO: Rave Perú] [USUARIO: Pepito] TRABAJO NIVEL 2 ALEATORIO: bartender ✅
```

#### 8. Pepito Intenta Robar (Solo de Billetera)

```
Pepito: .robar @carlos

Bot: ❌ *Robo Imposible*

@Carlos no tiene dinero en su billetera
💰 *Billetera de Carlos*: S/ 0,00
🏦 *Dinero en banco*: S/ 2 500,00

💡 *Solo puedes robar dinero en efectivo (billetera)*

[DEBUG] [GRUPO: Rave Perú] [USUARIO: Pepito] ROBO FALLIDO - OBJETIVO SIN DINERO EN BILLETERA ✅

// Carlos retira dinero
Carlos: .withdraw 500

Pepito: .rob @carlos

Bot: 💰 *Robo Exitoso*

🥷 Robaste S/ 85,00 de @Carlos (17% de su billetera)
⭐ +25 XP ganados
🎯 *Racha de robos*: 1 exitoso

💰 *Tu saldo*: S/ 425,00
📊 *Estadísticas*: 1 robo exitoso, 0 fallidos

[DEBUG] [GRUPO: Rave Perú] [USUARIO: Pepito] ROBO EXITOSO: S/ 85,00 DE BILLETERA ✅
```

#### 9. Pepito Compra Comida Peruana

```
Pepito: .shop food_drinks

Bot: 🍽️ *Comida y Bebidas Disponibles*

🐟 **Ceviche** - S/ 25,00
📝 Fresco y picante, como debe ser
🎯 Nivel requerido: 1
Comprar: *.buy ceviche*

🥩 **Lomo Saltado** - S/ 28,00  
📝 Un clásico que nunca falla
🎯 Nivel requerido: 1
Comprar: *.buy lomo_saltado*

🍗 **1/4 de Pollo a la Brasa** - S/ 18,00
📝 Un clásico peruano para el bajón
🎯 Nivel requerido: 1
Comprar: *.buy pollo_brasa*

🥤 **Inca Kola** - S/ 4,00
📝 La bebida de sabor nacional
🎯 Nivel requerido: 1
Comprar: *.buy inca_kola*

🍸 **Pisco Sour** - S/ 15,00
📝 El cóctel bandera del Perú
🎯 Nivel requerido: 2
Comprar: *.buy pisco_sour*

Pepito: .buy ceviche

Bot: ✅ *Compra Exitosa*

🐟 Has comprado: **Ceviche** 
💰 *Costo*: S/ 25,00
💵 *Saldo actual*: S/ 400,00
⭐ *XP ganado*: +1 (Total: 196 XP)

🍽️ *Efectos*: +18 hambre, +5 sed, -1 estrés

[DEBUG] [GRUPO: Rave Perú] [USUARIO: Pepito] COMPRA: ceviche S/ 25,00 ✅
```

#### 10. Sistema de Conversión de Divisas Automática

```javascript
// Ejemplo de conversión automática cuando se configura el grupo

// Valores base en USD (por defecto)
const baseValues = {
  initialLoan: 5000.00,      // $5,000 USD
  jobSalaries: {
    level1: { min: 80, max: 120 },   // $80-120 USD
    level2: { min: 120, max: 160 }   // $120-160 USD
  },
  shopItems: {
    bicycle: 800.00,         // $800 USD
    ceviche: 25.00          // $25 USD
  }
};

// Conversión automática a PEN (ejemplo: 1 USD = 3.75 PEN)
const convertedValues = {
  initialLoan: 18750.00,     // S/ 18,750.00
  jobSalaries: {
    level1: { min: 300, max: 450 },   // S/ 300-450
    level2: { min: 450, max: 600 }    // S/ 450-600
  },
  shopItems: {
    bicycle: 3000.00,        // S/ 3,000.00
    ceviche: 93.75          // S/ 93.75 → redondeado a S/ 94.00
  }
};
```

---

## 🔄 Sistema de APIs de Conversión con Fallback

### Implementación de Fallback de APIs

```javascript
class CurrencyService {
  constructor() {
    this.apis = [
      {
        name: 'Frankfurter',
        url: 'https://api.frankfurter.app/latest',
        method: 'GET',
        format: 'json',
        rateLimit: null // Sin límite
      },
      {
        name: 'ExchangeRate-API',
        url: 'https://v6.exchangerate-api.com/v6/YOUR_API_KEY/latest/USD',
        method: 'GET', 
        format: 'json',
        rateLimit: 1500 // 1,500 req/mes
      },
      {
        name: 'CurrencyFreaks',
        url: 'https://api.currencyfreaks.com/latest?apikey=YOUR_API_KEY',
        method: 'GET',
        format: 'json', 
        rateLimit: 10000 // 10,000 req/mes
      },
      {
        name: 'OpenExchangeRates',
        url: 'https://openexchangerates.org/api/latest.json?app_id=YOUR_API_KEY',
        method: 'GET',
        format: 'json',
        rateLimit: 1000 // 1,000 req/mes
      }
    ];
    this.currentApiIndex = 0;
    this.lastUpdate = null;
    this.cachedRates = {};
  }

  async getExchangeRate(fromCurrency = 'USD', toCurrency = 'PEN') {
    // Usar caché si es menor a 1 hora
    const cacheKey = `${fromCurrency}_${toCurrency}`;
    const now = new Date();
    
    if (this.cachedRates[cacheKey] && 
        this.lastUpdate && 
        (now - this.lastUpdate) < 3600000) { // 1 hora
      logger.info(`Using cached rate: ${fromCurrency}/${toCurrency} = ${this.cachedRates[cacheKey]}`);
      return this.cachedRates[cacheKey];
    }

    // Intentar APIs en orden de fallback
    for (let i = 0; i < this.apis.length; i++) {
      const apiIndex = (this.currentApiIndex + i) % this.apis.length;
      const api = this.apis[apiIndex];
      
      try {
        logger.info(`Trying ${api.name} API for ${fromCurrency}/${toCurrency}`);
        const rate = await this.fetchFromAPI(api, fromCurrency, toCurrency);
        
        if (rate) {
          // Actualizar caché
          this.cachedRates[cacheKey] = rate;
          this.lastUpdate = now;
          this.currentApiIndex = apiIndex; // Usar esta API la próxima vez
          
          logger.info(`Successfully got rate from ${api.name}: ${rate}`);
          return rate;
        }
      } catch (error) {
        logger.warn(`${api.name} API failed:`, error.message);
        continue; // Intentar siguiente API
      }
    }
    
    // Si todas las APIs fallan, usar tasa por defecto
    logger.error('All currency APIs failed, using default rate');
    return this.getDefaultRate(fromCurrency, toCurrency);
  }

  async fetchFromAPI(api, from, to) {
    const response = await fetch(api.url, {
      method: api.method,
      timeout: 5000 // 5 segundos timeout
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    // Parsear respuesta según la API
    switch (api.name) {
      case 'Frankfurter':
        return data.rates[to] || null;
      case 'ExchangeRate-API':
        return data.conversion_rates[to] || null;
      case 'CurrencyFreaks':
        return data.rates[to] || null;
      case 'OpenExchangeRates':
        return data.rates[to] || null;
      default:
        return null;
    }
  }

  getDefaultRate(from, to) {
    // Tasas por defecto actualizadas mensualmente
    const defaultRates = {
      'USD_PEN': 3.75,
      'USD_ARS': 1020.00,
      'USD_COP': 4180.00,
      'USD_EUR': 0.92,
      'USD_MXN': 17.50
    };
    
    return defaultRates[`${from}_${to}`] || 1.00;
  }
}
```

---

## 🎮 Comandos Completos con Aliases

### Comandos de Préstamos y Pagos

```javascript
// Préstamos
{
  name: "loan",
  description: "Solicitar préstamo al banco o a otro usuario",
  aliases: ['prestame', 'prestar', 'pedir', 'loan'],
  usage: [
    ".prestame banco 1000 dias 7",
    ".prestame @usuario 500 dias 5"
  ],
  category: "economy",
  examples: [
    "Banco: .prestame banco 2000 dias 10",
    "Usuario: .prestame @maría 800 dias 3"
  ]
}

// Pagos
{
  name: "pay",
  description: "Pagar préstamos bancarios o deudas con usuarios",
  aliases: ['pay', 'pagar', 'abonar'],
  usage: [
    ".pay banco 1000",
    ".pay @usuario 500",
    ".pagar banco all"
  ],
  category: "economy",
  examples: [
    "Banco: .pay banco 1500",
    "Usuario: .pay @carlos 300",
    "Total: .pagar banco all"
  ]
}

// Aceptar/Rechazar préstamos
{
  name: "accept",
  description: "Aceptar solicitud de préstamo de otro usuario",
  aliases: ['aceptar', 'accept', 'aprobar', 'si'],
  usage: ".aceptar",
  category: "economy"
}

{
  name: "reject", 
  description: "Rechazar solicitud de préstamo de otro usuario",
  aliases: ['rechazar', 'reject', 'negar', 'no'],
  usage: ".rechazar",
  category: "economy"
}
```

### Comandos de Morosidad

```javascript
// Lista de morosos
{
  name: "defaulters",
  description: "Ver lista de usuarios morosos (InfoCorp/SBS)",
  aliases: ['morosos', 'sbs', 'infocrop', 'infocorp', 'deudores'],
  usage: ".morosos",
  category: "admin",
  permissions: ["admin"],
  cooldown: 10000
}

// Historial crediticio
{
  name: "creditHistory",
  description: "Ver historial crediticio propio o de otro usuario",
  aliases: ['historial', 'creditos', 'score', 'calificacion'],
  usage: [
    ".historial",
    ".score @usuario"
  ],
  category: "economy"
}
```

---

## 📊 Sistema de Estadísticas y Métricas

### Métricas Avanzadas por Grupo

```javascript
const groupAdvancedMetrics = {
  // Métricas básicas
  totalUsers: 25,
  activeUsers: 18,
  inactiveUsers: 7,
  
  // Métricas económicas  
  totalTransactions: 1247,
  bankCapital: 985000,
  totalLoansGiven: 75000,
  totalUserLoans: 12500, // Préstamos entre usuarios
  averageWealth: 8500,
  wealthDistribution: {
    poor: 8,      // < 1,000
    middle: 12,   // 1,000 - 10,000  
    rich: 4,      // 10,000 - 50,000
    wealthy: 1    // > 50,000
  },
  
  // Métricas crediticias
  creditMetrics: {
    totalDefaulters: 3,
    defaultRate: 12, // % de usuarios morosos  
    averageCreditScore: 67,
    bankLoanDefaultRate: 8, // % préstamos bancarios en mora
    userLoanDefaultRate: 15, // % préstamos usuarios en mora
    totalBadDebt: 5200 // Deuda incobrable total
  },
  
  // Métricas de actividad
  activityMetrics: {
    dailyCommands: 234,
    mostUsedCommand: 'work',
    commandDistribution: {
      work: 35,
      balance: 20,  
      shop: 15,
      rob: 12,
      other: 18
    },
    averageLevel: 2.3,
    levelDistribution: {
      level1: 8,
      level2: 9,
      level3: 5,
      level4: 2,
      level5: 1
    }
  },
  
  // Métricas de seguridad
  securityMetrics: {
    totalRobberies: 89,
    successfulRobberies: 35,
    robberySuccessRate: 39,
    totalFines: 15600,
    averageFine: 320
  }
};
```

### Dashboard Web Avanzado

**URL**: `ravehublatam.com/admin/dashboard/[groupId]`

**Funcionalidades del Dashboard**:
- 📊 **Gráficos en tiempo real** de actividad económica
- 💳 **Monitor de préstamos** con alertas de morosidad
- 🏆 **Rankings dinámicos** con filtros por período
- 🚨 **Alertas de seguridad** para actividad sospechosa
- 📈 **Proyecciones financieras** del grupo
- 🔧 **Herramientas de administración** para moderadores

---

## 🔧 Herramientas de Administración Avanzadas

### Comandos de Admin Exclusivos

```javascript
// Reset de usuario específico
{
  name: "resetUser",
  description: "Resetear datos de un usuario específico",
  aliases: ['resetuser', 'limpiar', 'borrar'],
  usage: ".resetuser @usuario",
  category: "admin",
  permissions: ["admin"]
}

// Otorgar dinero (emergencias)
{
  name: "grant",
  description: "Otorgar dinero a un usuario (solo emergencias)",
  aliases: ['grant', 'dar', 'otorgar'],
  usage: ".grant @usuario 1000",
  category: "admin", 
  permissions: ["admin"],
  cooldown: 300000 // 5 minutos entre usos
}

// Perdón de deudas
{
  name: "forgive",
  description: "Perdonar deudas de un usuario moroso",
  aliases: ['forgive', 'perdonar', 'amnistia'],
  usage: ".forgive @usuario",
  category: "admin",
  permissions: ["admin"]
}

// Backup del grupo
{
  name: "backup",
  description: "Crear backup de todos los datos del grupo",
  aliases: ['backup', 'respaldar'],
  usage: ".backup",
  category: "admin",
  permissions: ["admin"],
  cooldown: 3600000 // 1 hora entre backups
}
```

---

## 🎯 Validaciones y Seguridad Mejoradas

### Validaciones Anti-Exploit

```javascript
const securityValidations = {
  // Anti-spam mejorado
  commandLimits: {
    work: { limit: 1, window: 'cooldown' }, // Según nivel
    rob: { limit: 3, window: 86400000 },    // 3 robos por día
    shop: { limit: 20, window: 3600000 },   // 20 consultas por hora
    loan: { limit: 3, window: 86400000 },   // 3 solicitudes por día
    general: { limit: 50, window: 3600000 } // 50 comandos por hora
  },
  
  // Detección de actividad sospechosa
  suspiciousActivity: {
    rapidTransactions: 10, // Más de 10 transacciones en 5 minutos
    unusualAmounts: 50000, // Transacciones > 50,000 en un día
    multipleRobberies: 5,  // Más de 5 robos exitosos seguidos
    selfTransactions: true // Detectar auto-transferencias
  },
  
  // Límites de sistema
  systemLimits: {
    maxLoanAmount: 100000,      // Préstamo máximo del banco
    maxUserLoanAmount: 10000,   // Préstamo máximo entre usuarios  
    maxInventoryValue: 500000,  // Valor máximo de inventario
    maxTransactionAmount: 25000 // Transacción máxima individual
  }
};
```

### Sistema de Alertas Automáticas

```javascript
const alertSystem = {
  // Alertas críticas (notificar admins inmediatamente)
  critical: [
    'Usuario con más de 10 préstamos activos',
    'Pérdida bancaria > 50,000 en un día',
    'Más de 5 usuarios morosos simultáneamente',
    'Actividad de comandos > 1000/hora'
  ],
  
  // Alertas de advertencia (revisar diariamente)
  warning: [
    'Usuario con score crediticio < 30',
    'Tasa de morosidad > 15%',
    'Robos exitosos > 80% en un día',
    'Nuevo usuario con transacciones > 10,000'
  ],
  
  // Alertas informativas (revisar semanalmente)
  info: [
    'Nuevo usuario registrado',
    'Usuario subió 2+ niveles en un día',
    'Compra de item legendario',
    'Grupo alcanzó nuevo récord de actividad'
  ]
};
```

---

## 📅 Plan de Desarrollo Completo (8 Semanas / 56 Días)

### **FASE 1: FUNDACIÓN (Semana 1 - Días 1-7)**

#### **Día 1-2: Estructura Base del Proyecto**
- ✅ Crear estructura de carpetas completa
- ✅ Configurar package.json con todas las dependencias
- ✅ Configurar variables de entorno (.env)
        GEMINI_API_KEY=AIzaSyACZHdGchDK9QFpu-Fk77QopkRGrdBHeWo
        MONGODB_URI=mongodb+srv://ravehub:wAf1un3vkBqjrXlW@clusterbotwhatsapp.3wydvbj.mongodb.net/?retryWrites=true&w=majority&appName=ClusterBotWhatsApp
        SESSION_ID=
        PREFIX=.
        OWNER_NUMBER=56944324385
        WARN_LIMIT=3
        GEMINI_API_KEY=AIzaSyCBBq7FvtGV36Svw1_vMXbRvH5wXQnEHOI
- ✅ Establecer sistema de logging (winston)
- ✅ Configurar PM2 (ecosystem.config.js)

**Entregable**: Estructura base funcional con logging

#### **Día 3-4: Conexión WhatsApp + Base de Datos**
- ✅ Implementar conexión Baileys (src/bot/core/client.js)
- ✅ Configurar MongoDB + Mongoose (src/bot/core/database.js)
- ✅ Crear modelos básicos (User.js, Group.js)
- ✅ Handler básico de mensajes (messageHandler.js)

**Prueba**: Bot se conecta a WhatsApp y responde a `.ping`

#### **Día 5: Sistema de Comandos Base**
- ✅ Router de comandos (commandHandler.js)
- ✅ Middleware de validación (groupValidator.js)
- ✅ Comando `.help` básico
- ✅ Sistema de aliases

**Prueba**: `.help` muestra lista de comandos

#### **Día 6-7: Inicialización de Grupos**
- ✅ Comando `.init` con países
- ✅ Registro automático de usuarios
- ✅ Sistema de conversión de divisas (1 API)
- ✅ Formateo de números correcto

**Prueba**: `.init peru` configura grupo correctamente

---

### **FASE 2: ECONOMÍA BÁSICA (Semana 2 - Días 8-14)**

#### **Día 8-9: Sistema de Usuarios y Balance**
- ✅ Modelo User completo con todas las propiedades
- ✅ Comandos `.balance`, `.me`, `.perfil`
- ✅ Sistema de billetera vs banco
- ✅ Préstamo inicial automático de S/ 5,000

**Prueba**: Usuarios pueden ver su balance inicial

#### **Día 10-11: Sistema de Trabajo**
- ✅ Archivo jobs.json con trabajos por nivel
- ✅ Comando `.work` con selección aleatoria
- ✅ Sistema de cooldowns por nivel
- ✅ Ganancia de XP y dinero

**Prueba**: `.work` funciona con diferentes trabajos aleatorios

#### **Día 12-13: Sistema Bancario Básico**
- ✅ Comandos `.deposit` y `.withdraw`
- ✅ Validaciones de saldo
- ✅ Transacciones seguras
- ✅ Historial de transacciones

**Prueba**: Depositar y retirar dinero funciona correctamente

#### **Día 14: Transferencias Entre Usuarios**
- ✅ Comando `.transfer` o `.enviar`
- ✅ Validaciones de usuario válido
- ✅ Confirmación de transacciones
- ✅ Sistema anti-spam

**Prueba**: Transferir dinero entre usuarios

---

### **FASE 3: SISTEMA DE PRÉSTAMOS (Semana 3 - Días 15-21)**

#### **Día 15-16: Préstamos Bancarios**
- ✅ Algoritmo de evaluación crediticia
- ✅ Comando `.prestame banco <cantidad> dias <días>`
- ✅ Sistema de intereses y fechas de vencimiento
- ✅ Modelo CreditHistory completo

**Prueba**: Solicitar y recibir préstamo bancario

#### **Día 17-18: Préstamos Entre Usuarios**
- ✅ Comando `.prestame @usuario <cantidad> dias <días>`
- ✅ Sistema de aceptación/rechazo (`.aceptar`, `.rechazar`)
- ✅ Modelo UserLoan
- ✅ Timeout de 5 minutos para responder

**Prueba**: Préstamos entre usuarios con aceptación manual

#### **Día 19-20: Sistema de Pagos**
- ✅ Comando `.pay banco <cantidad>` y `.pay @usuario <cantidad>`
- ✅ Opción `.pay banco all` para pagar todo
- ✅ Actualización de scores crediticios
- ✅ Lógica de liberación de deudas

**Prueba**: Pagar préstamos bancarios y de usuarios

#### **Día 21: Sistema de Morosidad Base**
- ✅ Detección automática de morosidad
- ✅ Cálculo de días vencidos
- ✅ Actualización de scores crediticios
- ✅ Restricciones para morosos

**Prueba**: Usuario moroso con restricciones aplicadas

---

### **FASE 4: CONVERSIÓN DE DIVISAS Y ROBOS (Semana 4 - Días 22-28)**

#### **Día 22-23: Sistema de APIs de Divisas Completo**
- ✅ Implementar 4 APIs con fallback (currencyService.js)
- ✅ Sistema de caché de 1 hora
- ✅ Conversión automática por grupo
- ✅ Tasas por defecto como último recurso

**Prueba**: Conversión funciona aunque fallen 2-3 APIs

#### **Día 24-25: Sistema de Robos Mejorado**
- ✅ Robo solo de billetera (no banco)
- ✅ Probabilidades basadas en nivel
- ✅ Sistema de multas por robo fallido
- ✅ Comando `.robar @usuario`

**Prueba**: Robos exitosos y fallidos con multas

#### **Día 26-27: InfoCorp/SBS Sistema**
- ✅ Comando `.morosos`, `.sbs`, `.infocrop`
- ✅ Lista detallada de usuarios morosos
- ✅ Razones específicas de morosidad
- ✅ Estadísticas del grupo

**Prueba**: Ver lista de morosos con detalles

#### **Día 28: Niveles y XP Completo**
- ✅ Sistema de niveles 1-10 completo
- ✅ Ganancia de XP por todas las actividades
- ✅ Cooldowns variables por nivel
- ✅ Comando `.nivel` o `.level`

**Prueba**: Subir de nivel y ver cambios en cooldowns

---

### **FASE 5: TIENDA Y SOCIAL (Semana 5 - Días 29-35)**

#### **Día 29-30: Tienda Base**
- ✅ Archivo shopItems.json completo
- ✅ Comando `.shop [categoría]`
- ✅ Categorización por tipo (comida, vehículos, etc.)
- ✅ Validación de nivel requerido

**Prueba**: Ver tienda por categorías

#### **Día 31-32: Compras y Ventas**
- ✅ Comando `.buy <item>` con validaciones
- ✅ Comando `.sell <item>` con valor de reventa
- ✅ Sistema de inventario (`.inventory`, `.inv`)
- ✅ Comando `.gift @usuario <item>`

**Prueba**: Comprar, vender y regalar items

#### **Día 33-34: Sistema Social**
- ✅ Comando `.ricos`, `.top`, `.ranking`
- ✅ Rankings por dinero, nivel, XP
- ✅ Filtros por período (semanal, mensual)
- ✅ Comando `.perfil @usuario`

**Prueba**: Ver rankings y perfiles de otros usuarios

#### **Día 35: Games Básicos**
- ✅ Comando `.coinflip <cantidad> <cara/cruz>`
- ✅ Comando `.dice <cantidad>`
- ✅ Validaciones de saldo
- ✅ Restricciones para morosos

**Prueba**: Juegos funcionan con apuestas reales

---

### **FASE 6: ADMINISTRACIÓN Y SEGURIDAD (Semana 6 - Días 36-42)**

#### **Día 36-37: Herramientas de Admin**
- ✅ Comando `.config` para ver configuración del grupo
- ✅ Comando `.reset` para resetear grupo
- ✅ Comando `.grant @usuario <cantidad>` (emergencias)
- ✅ Validación de permisos de admin

**Prueba**: Solo admins pueden usar comandos restringidos

#### **Día 38-39: Sistema Anti-Spam y Seguridad**
- ✅ Rate limiting por comando (rateLimiter.js)
- ✅ Anti-spam general (antiSpam.js)
- ✅ Detección de actividad sospechosa
- ✅ Sistema de alertas automáticas

**Prueba**: Rate limiting funciona correctamente

#### **Día 40-41: Sistema de Notificaciones**
- ✅ Notificaciones de morosidad automáticas
- ✅ Recordatorios de pago
- ✅ Alertas de actividad sospechosa
- ✅ Notificaciones de nivel subido

**Prueba**: Recibir notificaciones automáticas

#### **Día 42: Backup y Métricas**
- ✅ Comando `.backup` para admins
- ✅ Métricas avanzadas del grupo
- ✅ Estadísticas de actividad
- ✅ Exportación de datos

**Prueba**: Generar backup completo del grupo

---

### **FASE 7: APLICACIÓN WEB (Semana 7 - Días 43-49)**

#### **Día 43-44: Estructura Next.js**
- ✅ Configurar Next.js 14 con App Router
- ✅ Configurar Tailwind CSS
- ✅ Estructura de componentes base
- ✅ Conexión con base de datos MongoDB

**Prueba**: Aplicación web carga correctamente

#### **Día 45-46: Páginas de Perfil y Rankings**
- ✅ Página `/profile/[userId]/[groupId]`
- ✅ Página `/leaderboard/[groupId]`
- ✅ Componentes UserProfile y Leaderboard
- ✅ Datos en tiempo real

**Prueba**: Ver perfiles y rankings en web

#### **Día 47-48: Dashboard de Admin**
- ✅ Página `/admin/dashboard/[groupId]`
- ✅ Métricas avanzadas con gráficos
- ✅ Monitor de morosidad
- ✅ Herramientas de administración

**Prueba**: Dashboard funcional para admins

#### **Día 49: Página de Crédito**
- ✅ Página `/credit/[groupId]`
- ✅ Reporte InfoCorp web
- ✅ Historial crediticio detallado
- ✅ Gráficos de evolución

**Prueba**: Reportes crediticios en web

---

### **FASE 8: OPTIMIZACIÓN Y DEPLOYMENT (Semana 8 - Días 50-56)**

#### **Día 50-51: Optimización y Testing**
- ✅ Optimización de consultas MongoDB
- ✅ Testing de todos los comandos
- ✅ Pruebas de carga y stress testing
- ✅ Corrección de bugs encontrados

**Prueba**: Bot maneja 100+ usuarios simultáneos

#### **Día 52-53: Deploy Producción**
- ✅ Configurar VPS Ubuntu para el bot
- ✅ Deploy en Vercel para Next.js
- ✅ Configurar dominio ravehublatam.com
- ✅ SSL y seguridad

**Prueba**: Bot funcionando en producción

#### **Día 54-55: Monitoreo y Alertas**
- ✅ Sistema de monitoreo con logs
- ✅ Alertas por email/Discord para errores
- ✅ Dashboard de sistema
- ✅ Backup automático diario

**Prueba**: Monitoreo reporta métricas correctamente

#### **Día 56: Documentación y Lanzamiento**
- ✅ Documentación técnica completa
- ✅ Manual de usuario
- ✅ Manual de administrador
- ✅ Video tutoriales básicos

**Prueba**: Nuevos usuarios pueden usar el bot sin ayuda

---

## 🎯 Objetivos de Testing por Fase

### **Criterios de Aprobación por Fase:**

1. **Fase 1**: Bot responde a comandos básicos
2. **Fase 2**: Economía básica funcional (trabajo, depósitos, transferencias)
3. **Fase 3**: Sistema de préstamos completo con morosidad
4. **Fase 4**: Conversión de divisas y robos funcionando
5. **Fase 5**: Tienda y sistema social operativo
6. **Fase 6**: Herramientas de admin y seguridad implementadas
7. **Fase 7**: Aplicación web conectada a datos del bot
8. **Fase 8**: Sistema completo en producción

### **Métricas de Éxito Final:**
- ✅ Bot maneja 50+ usuarios por grupo sin problemas
- ✅ Tiempo de respuesta < 2 segundos para comandos básicos
- ✅ Sistema económico balanceado (morosidad < 15%)
- ✅ 0 errores críticos en 48 horas de testing
- ✅ Aplicación web carga en < 3 segundos
- ✅ 95%+ uptime en producción





### Estado Final del Sistema

Al implementar este PRD completo, **RaveHub Bot** contará con:

✅ **Sistema económico realista** con préstamos, morosidad e InfoCorp
✅ **Conversión automática de divisas** con 4 APIs en fallback  
✅ **Formateo correcto de números** (comas en lugar de puntos)
✅ **Préstamos entre usuarios** con aceptación/rechazo manual
✅ **Sistema de robos mejorado** (solo billetera, no banco)
✅ **Trabajos aleatorios por nivel** con múltiples opciones
✅ **Tienda con comida peruana** y categorización completa
✅ **Morosidad automática** con rehabilitación por pago
✅ **Dashboards web avanzados** con métricas en tiempo real
✅ **Seguridad anti-exploit** con límites y alertas
✅ **Administración completa** con herramientas de moderación

### Roadmap de Implementación (8 Semanas)

**Semanas 1-2**: Core del bot + sistema de divisas + trabajos aleatorios
**Semanas 3-4**: Sistema de préstamos entre usuarios + morosidad InfoCorp  
**Semanas 5-6**: Tienda peruana + robos mejorados + formateo de números
**Semanas 7-8**: Dashboard web + métricas avanzadas + herramientas admin

### Métricas de Éxito Esperadas

- **👥 Engagement**: 80%+ usuarios activos diariamente
- **💰 Economía**: Flujo de transacciones > 10,000/día por grupo
- **📊 Morosidad**: Tasa < 10% (sistema crediticio efectivo)
- **🎮 Gamificación**: Promedio 2.5+ nivel por usuario activo
- **🌐 Web**: 60%+ usuarios visitan dashboard mensualmente

**RaveHub Bot** se convertirá en la plataforma de economía virtual más completa y realista de WhatsApp, ofreciendo una experiencia inmersiva que mantendrá a las comunidades activas y comprometidas. 🎉🚀
   