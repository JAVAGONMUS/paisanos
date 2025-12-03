const { Sequelize } = require('sequelize');
require('dotenv').config();

// --- 1. Conexión MySQL (Transaccional) ---
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

// --- 2. Conexión PostgreSQL (Geoespacial/GIS) ---
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
  
  // 💡 Esta función solo autentica (verifica la conexión), ya no sincroniza.
  authenticateDBs: async () => {
    try {
        // --- Autenticación MySQL ---
        await sequelizeMySQL.authenticate();
        console.log('✅ Conexión MySQL (Transaccional) establecida.');

        // --- Autenticación PostgreSQL ---
        await sequelizePostgres.authenticate();
        console.log('✅ Conexión PostgreSQL (Geo) establecida.');

    } catch (error) {
      console.error('❌ Error al conectar alguna de las DB:', error);
      throw error;
    }
  }
};
