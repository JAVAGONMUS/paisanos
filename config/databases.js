//archivo backend ../config/databases.js
const { Sequelize } = require('sequelize');
const { Pool } = require('pg');
require('dotenv').config();

const sslConfig = {
  require: true,
  rejectUnauthorized: false
};

// --- Conexión Única PostgreSQL (Sequelize) ---
// Priorizamos DATABASE_URL si existe, de lo contrario usamos variables individuales
const sequelizePostgres = process.env.DATABASE_URL 
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false // Necesario para conexiones externas como TigerData/Render
        }
      },
      define: {
        freezeTableName: true
      }
    })
  : new Sequelize(
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
// Evitamos mezclar parámetros: si hay connectionString, usamos solo esa.
const poolConfig = process.env.DATABASE_URL 
  ? { 
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig 
    }
  : {
      host: process.env.PG_DB_HOST,
      user: process.env.PG_DB_USER,
      password: process.env.PG_DB_PASSWORD,
      database: process.env.PG_DB_NAME,
      port: process.env.PG_DB_PORT,
      ssl: sslConfig
    };

const pool = new Pool(poolConfig);

module.exports = {
  sequelizePostgres,
  pool, 
  authenticateDBs: async () => {
    try {
        console.log('⏳ Conectando a PostgreSQL en TigerData...');
        
        // 1. Probar Sequelize
        await sequelizePostgres.authenticate();
        console.log('✅ Conexión unificada PostgreSQL (Sequelize) OK.');
        
        // 2. Probar Pool Crudo
        const client = await pool.connect();
        const res = await client.query('SELECT NOW()');
        console.log('✅ Pool de PostgreSQL (pg) OK:', res.rows[0].now);
        client.release(); // Importante liberar el cliente del pool

    } catch (error) {
      console.error('❌ Error crítico de conexión en databases.js:', error);
      // Imprimimos el error completo para debuggear si es SSL o Autenticación
      throw error;
    }
  }
};
