require('dotenv').config();
const mongoose = require('mongoose');
const Debt = require('./models/Debt');
const User = require('./models/User');

const migrateDebts = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Conectado a MongoDB para la migración...');

        // 1. Actualizar todas las deudas existentes al 10% de interés
        const debtUpdateResult = await Debt.updateMany({}, { $set: { interest: 0.10 } });
        console.log(`${debtUpdateResult.modifiedCount} deudas actualizadas a la nueva tasa de interés del 10%.`);

        // 2. Reiniciar el historial de morosidad de todos los usuarios
        const userUpdateResult = await User.updateMany(
            { 'paymentHistory.paidLate': { $gt: 0 } },
            { $set: { 'paymentHistory.paidLate': 0 } }
        );
        console.log(`${userUpdateResult.modifiedCount} usuarios con historial de morosidad han sido reiniciados.`);

        // 3. Reiniciar el estado 'isDelinquent' en todas las deudas
        const delinquentDebtUpdateResult = await Debt.updateMany(
            { isDelinquent: true },
            { $set: { isDelinquent: false } }
        );
        console.log(`${delinquentDebtUpdateResult.modifiedCount} deudas morosas han sido reiniciadas.`);

        console.log('¡Migración completada! El sistema ahora re-evaluará a todos los deudores con las nuevas reglas.');

    } catch (error) {
        console.error('Error durante la migración:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Conexión a MongoDB cerrada.');
    }
};

migrateDebts();
