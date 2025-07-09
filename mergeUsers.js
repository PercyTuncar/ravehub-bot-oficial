// Script para fusionar usuarios duplicados en MongoDB
// Ejecuta este script con Node.js después de configurar tu conexión a MongoDB

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function mergeDuplicates() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Conectado a MongoDB');

  // Encuentra duplicados por jid+groupId
  const duplicates = await User.aggregate([
    { $group: {
      _id: { jid: '$jid', groupId: '$groupId' },
      count: { $sum: 1 },
      ids: { $push: '$_id' }
    }},
    { $match: { count: { $gt: 1 } } }
  ]);

  for (const dup of duplicates) {
    const users = await User.find({ _id: { $in: dup.ids } });
    // Elige el usuario a conservar (el más reciente)
    const mainUser = users.reduce((a, b) => a.createdAt > b.createdAt ? a : b);
    const toMerge = users.filter(u => u._id.toString() !== mainUser._id.toString());

    for (const u of toMerge) {
      // Fusiona saldos, XP, historial, inventario, etc.
      mainUser.economy.wallet += u.economy.wallet;
      mainUser.economy.bank += u.economy.bank;
      mainUser.xp += u.xp;
      mainUser.level = Math.max(mainUser.level, u.level);
      mainUser.judicialDebt += u.judicialDebt;
      mainUser.paymentHistory.paidOnTime += u.paymentHistory.paidOnTime;
      mainUser.paymentHistory.paidLate += u.paymentHistory.paidLate;
      mainUser.warnings += u.warnings;
      // Fusiona inventario (por nombre de item)
      for (const item of u.inventory) {
        const idx = mainUser.inventory.findIndex(i => i.name === item.name);
        if (idx >= 0) mainUser.inventory[idx].quantity += item.quantity;
        else mainUser.inventory.push(item);
      }
      // Fusiona deudas (evita duplicados)
      for (const debt of u.debts) {
        if (!mainUser.debts.map(d => d.toString()).includes(debt.toString())) {
          mainUser.debts.push(debt);
        }
      }
      // Elimina el usuario duplicado
      await User.deleteOne({ _id: u._id });
      console.log(`Usuario duplicado eliminado: ${u._id}`);
    }
    await mainUser.save();
    console.log(`Usuario principal actualizado: ${mainUser._id}`);
  }
  console.log('Fusión de duplicados completada.');
  await mongoose.disconnect();
}

mergeDuplicates().catch(console.error);
