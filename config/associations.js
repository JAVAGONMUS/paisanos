// /app/config/associations.js

const Pais = require('../models/Pais');
const Departamento = require('../models/Departamento');
const Municipio = require('../models/Municipio'); 

exports.setupAssociations = () => {
    // 1. Relación entre PAISES y DEPARTAMENTOS
    Pais.hasMany(Departamento, {
        foreignKey: 'ID_PAIS', 
        as: 'departamentos'
    });
    Departamento.belongsTo(Pais, { foreignKey: 'ID_PAIS' });

    // 2. Relación entre DEPARTAMENTOS y MUNICIPIOS
    Departamento.hasMany(Municipio, { // Esta línea es la que fallaba
        foreignKey: 'ID_DEP', 
        as: 'municipios'
    });
    Municipio.belongsTo(Departamento, { foreignKey: 'ID_DEP' });
    
    // Retornar los modelos para usarlos en el controlador si es necesario
    return { Pais, Departamento, Municipio };
};
