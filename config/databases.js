// config/databases.js
const { Sequelize } = require('sequelize');
const { Pool } = require('pg'); // 👈 AGREGADO: Necesario para consultas SQL puras
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

// --- Conexión PostgreSQL (para Sequelize/Modelos) ---
const sequelizePostgres = new Sequelize(
  process.env.PG_DB_NAME,
  process.env.PG_DB_USER,
  process.env.PG_DB_PASSWORD,
  {
    host: process.env.PG_DB_HOST,
    port: process.env.PG_DB_PORT,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    define: {
      freezeTableName: true
    }
  }
);

// --- OBJETO POOL (para consultas rápidas de GPS en ubicacionController) ---
// 👈 AGREGADO: Esto es lo que causaba el error "undefined (reading 'connect')"
const pool = new Pool({
  user: process.env.PG_DB_USER,
  host: process.env.PG_DB_HOST,
  database: process.env.PG_DB_NAME,
  password: process.env.PG_DB_PASSWORD,
  port: process.env.PG_DB_PORT,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = {
  sequelizeMySQL,
  sequelizePostgres,
  pool, // 👈 VITAL: Exportamos el pool para el controlador
  
  authenticateDBs: async () => {
    try {
        await sequelizeMySQL.authenticate();
        console.log('✅ Conexión MySQL (Transaccional) establecida.');
        
        await sequelizePostgres.authenticate();
        console.log('✅ Conexión PostgreSQL (Geo) establecida.');

        // También verificamos el Pool
        await pool.query('SELECT NOW()');
        console.log('✅ Pool de PostgreSQL listo para GPS.');

    } catch (error) {
      console.error('❌ Error al conectar alguna de las DB:', error);
      throw error;
    }
  }
};
