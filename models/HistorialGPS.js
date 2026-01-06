const { DataTypes } = require('sequelize');
const { sequelizePostgres } = require('../config/databases');

const HistorialGPS = sequelizePostgres.define('HistorialGPS', {
    ID_GPS: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    ID_COND: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'CONDUCTORES', // Nombre de la tabla tal cual en Postgres
            key: 'ID_COND'
        }
    },
    UBICACION_LAT: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: false
    },
    UBICACION_LON: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: false
    },
    CREATED_AT: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW, // Genera el timestamp automáticamente en el servidor
        allowNull: false
    }
}, {
    tableName: 'HISTORIAL_GPS',
    timestamps: false // Desactivamos los timestamps automáticos de Sequelize porque ya usamos CREATED_AT
});

module.exports = HistorialGPS;