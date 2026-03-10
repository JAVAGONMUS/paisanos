const { DataTypes } = require('sequelize');
const { sequelizePostgres } = require('../config/databases');
const ZonaServicio = sequelizePostgres.define('ZonaServicio', {
    ID_ZONAS: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ID_PERSO: { type: DataTypes.INTEGER },
    NOMBRE: { type: DataTypes.STRING },
    NIVEL: { type: DataTypes.INTEGER },
    GEOMETRIA: { type: DataTypes.GEOMETRY('POLYGON', 4326) },
    ACTIVO: { type: DataTypes.BOOLEAN, defaultValue: true },
    MOTIVO: { type: DataTypes.TEXT }
}, {
    tableName: 'ZONAS_SERVICIO',
    timestamps: false
});
module.exports = ZonaServicio;