// /app/config/associations.js

const Pais = require('../models/Pais');
const Departamento = require('../models/Departamento');
const Municipio = require = ('../models/Municipio');

exports.setupAssociations = () => {
    // 1. Relación entre PAISES y DEPARTAMENTOS
    Pais.hasMany(Departamento, {
        foreignKey: 'ID_PAIS', // Campo en DEPARTAMENTOS que referencia a PAISES
        as: 'departamentos'
    });
    Departamento.belongsTo(Pais, { foreignKey: 'ID_PAIS' });

    // 2. Relación entre DEPARTAMENTOS y MUNICIPIOS
    Departamento.hasMany(Municipio, {
        foreignKey: 'ID_DEP', // Campo en MUNICIPIOS que referencia a DEPARTAMENTOS
        as: 'municipios'
    });
    Municipio.belongsTo(Departamento, { foreignKey: 'ID_DEP' });
    
    // Retornar los modelos para usarlos en el controlador si es necesario
    return { Pais, Departamento, Municipio };
};