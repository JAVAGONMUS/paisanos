const { Sequelize } = require('sequelize');
require('dotenv').config();

// --- Conexión MySQL ---
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

// --- Conexión PostgreSQL ---
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
  
  // Función renombrada para ser más clara: solo autentica
  authenticateDBs: async () => {
    try {
        await sequelizeMySQL.authenticate();
        console.log('✅ Conexión MySQL (Transaccional) establecida.');
        await sequelizePostgres.authenticate();
        console.log('✅ Conexión PostgreSQL (Geo) establecida.');

    } catch (error) {
      console.error('❌ Error al conectar alguna de las DB:', error);
      throw error;
    }
  }
};
