const { Sequelize } = require('sequelize');
const { Pool } = require('pg');
require('dotenv').config();

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

// --- Pool para consultas crudas (PostGIS / GPS) ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = {
  sequelizePostgres, // Única instancia de Sequelize
  pool, 
  authenticateDBs: async () => {
    try {
        await sequelizePostgres.authenticate();
        console.log('✅ Conexión unificada PostgreSQL (PostGIS) establecida.');
        
        await pool.query('SELECT NOW()');
        console.log('✅ Pool de PostgreSQL listo.');
    } catch (error) {
      console.error('❌ Error al conectar a PostgreSQL:', error);
      throw error;
    }
  }
};
