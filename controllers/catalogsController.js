// controllers/catalogsController.js
const Dominio = require('../models/Dominio');

/**
 * Obtiene la lista de dominios de correo electrónico disponibles 
 * desde la tabla DOMINIOS y los formatea para ser utilizados en un select (label/value).
 * @param {object} req - Objeto de solicitud de Express.
 * @param {object} res - Objeto de respuesta de Express.
 */
exports.getDomains = async (req, res) => {
    try {
        // 1. Buscar todos los dominios
        const dominios = await Dominio.findAll({
            
            attributes: ['ID_DOM', 'NOMBRE'], 
            // Opcional: ordenar por nombre para mejor usabilidad
            order: [['NOMBRE_DOMINIO', 'ASC']] // Usar el nombre de la propiedad del modelo para ordenar
        });
        console.log('DOMINIOS ENCONTRADOS:', dominios.length); 
        
        // 2. Formatear los datos a { label: 'nombre', value: 'nombre' }
        const formattedDomains = dominios.map(d => {
            
            const domainName = d.NOMBRE_DOMINIO; 
            
            return {
                label: domainName,
                value: domainName 
            };
        });
        
        console.log('DOMINIOS FORMATEADOS (Primeros 2):', formattedDomains.slice(0, 2)); 

        // 3. Responder con el catálogo
        res.status(200).json(formattedDomains);
    } catch (error) {
        // 4. Manejar errores de base de datos o internos
        console.error('Error al obtener catálogo de dominios:', error);
        res.status(500).json({ message: 'Error interno al cargar la lista de dominios.' });
    }
};
