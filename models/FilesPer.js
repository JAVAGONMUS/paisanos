const { DataTypes } = require('sequelize');
const { sequelizePostgres } = require('../config/databases');

const FilesPer = sequelizePostgres.define('FilesPer', {
    ID_PER: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    NOMBRE: {
        type: DataTypes.STRING(30),
        allowNull: false,
        field: 'NOMBRE',
    },
    CODIGO: {
        type: DataTypes.STRING(15),
        allowNull: false,
        field: 'CODIGO',
    },
    DESCRIPCION: { 
        type: DataTypes.TEXT, 
        allowNull: true,
        field: 'DESCRIPCION',
    },
    FECHA_ALTA: { type: DataTypes.DATEONLY, field: 'FECHA_ALTA' },
    HORA_ALTA: { type: DataTypes.TIME, field: 'HORA_ALTA' },
    USER_NEW_DATA: { type: DataTypes.INTEGER, field: 'USER_NEW_DATA' },
}, { tableName: 'PERFILES', timestamps: false });

module.exports = FilesPer;
