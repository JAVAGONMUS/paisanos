const { Sequelize } = require('sequelize');
require('dotenv').config();

// 💡 1. IMPORTAR MODELOS DE POSTGRESQL (Necesarios para la sincronización)
// -----------------------------------------------------------------------
// Solo necesitamos importar los modelos para la DB específica que van a sincronizar.
const Driver = require('../models/Driver'); // Tabla: CONDUCTORES
// const GpsHistory = require('../models/GpsHistory'); // Tabla: HISTORIAL_GPS
// const TravelHistory = require('../models/TravelHistory'); // Tabla: HISTORIAL_VIAJES
// const Vehicle = require('../models/Vehicle'); // Tabla: VEHICULOS
// const ActiveTrip = require('../models/ActiveTrip'); // Tabla: VIAJES_ACTIVOS
// const SearchConfig = require('../models/SearchConfig'); // Tabla: BUSCAR_CONFIG

// Si tienes más modelos de PostgreSQL, impórtalos aquí y agrégalos a la lista `pgModels`.
const pgModels = [
    Driver,
    // GpsHistory, // Descomentar y definir estos modelos cuando los uses
    // TravelHistory, 
    // Vehicle, 
    // ActiveTrip, 
    // SearchConfig
];
// -----------------------------------------------------------------------


// --- 2. Conexión MySQL (Transaccional) ---
const sequelizeMySQL = new Sequelize(
  process.env.MYSQL_DB_NAME,
  process.env.MYSQL_DB_USER,
  process.env.MYSQL_DB_PASSWORD,
  {
    host: process.env.MYSQL_DB_HOST,
    port: process.env.MYSQL_DB_PORT,
    dialect: 'mysql',
    logging: false,
    define: {
      freezeTableName: true 
    }
  }
);

// --- 3. Conexión PostgreSQL (Geoespacial/GIS) ---
const sequelizePostgres = new Sequelize(
  process.env.PG_DB_NAME,
  process.env.PG_DB_USER,
  process.env.PG_DB_PASSWORD,
  {
    host: process.env.PG_DB_HOST,
    port: process.env.PG_DB_PORT,
    dialect: 'postgres',
    logging: false,
    define: {
      freezeTableName: true
    }
  }
);


module.exports = {
  sequelizeMySQL,
  sequelizePostgres,
  
  // Función para autenticar y SINCRONIZAR
  authenticateAll: async () => {
    try {
        // --- Autenticación MySQL ---
        await sequelizeMySQL.authenticate();
        console.log('✅ Conexión MySQL (Transaccional) establecida.');
        // Opcional: Si tienes modelos de MySQL que necesiten sincronización, agrégalos aquí.

        // --- Autenticación PostgreSQL ---
        await sequelizePostgres.authenticate();
        console.log('✅ Conexión PostgreSQL (Geo) establecida.');

        // ----------------------------------------------------
        // ✨ PASO CLAVE: SINCRONIZAR MODELOS DE POSTGRESQL ✨
        // ----------------------------------------------------
        for (const Model of pgModels) {
            // { alter: true } intenta hacer cambios en la tabla existente sin borrar datos.
            await Model.sync({ alter: true }); 
            console.log(`   * Tabla ${Model.tableName || Model.name} sincronizada.`);
        }
        console.log('✅ Todos los modelos de PostgreSQL sincronizados exitosamente.');


    } catch (error) {
      console.error('❌ Error al conectar o sincronizar alguna de las DB:', error);
      throw error;
    }
  }
};
