const { Sequelize } = require('sequelize');
const { Pool } = require('pg');
require('dotenv').config();

// --- Configuración compartida de SSL ---
const sslConfig = {
  require: true,
  rejectUnauthorized: false
};

// --- Conexión Única PostgreSQL (Sequelize) ---
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
      ssl: sslConfig
    },
    define: {
      freezeTableName: true
    }
  }
);

// --- Pool para consultas crudas (PostGIS / GPS) ---
// Rectificado para usar las variables individuales si DATABASE_URL no existe
const pool = new Pool({
  host: process.env.PG_DB_HOST,
  user: process.env.PG_DB_USER,
  password: process.env.PG_DB_PASSWORD,
  database: process.env.PG_DB_NAME,
  port: process.env.PG_DB_PORT,
  ssl: sslConfig
});

module.exports = {
  sequelizePostgres,
  pool, 
  authenticateDBs: async () => {
    try {
        // 1. Probar Sequelize
        await sequelizePostgres.authenticate();
        console.log('✅ Conexión unificada PostgreSQL (Sequelize) OK.');
        
        // 2. Probar Pool Crudo
        const res = await pool.query('SELECT NOW()');
        console.log('✅ Pool de PostgreSQL (pg) OK:', res.rows[0].now);
    } catch (error) {
      console.error('❌ Error crítico de conexión en databases.js:', error.message);
      throw error;
    }
  }
};
