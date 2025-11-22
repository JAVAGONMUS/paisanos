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
    logging: false, // Desactiva la salida de consultas SQL en consola
    define: {
      freezeTableName: true // Evita pluralizar los nombres de las tablas
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

// Módulos que manejan las dependencias para Sequelize:
// npm install sequelize mysql2 pg pg-hstore 

module.exports = {
  sequelizeMySQL,
  sequelizePostgres,
  // Función para autenticar ambas al inicio
  authenticateAll: async () => {
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