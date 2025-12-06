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
            // Seleccionar solo los campos necesarios para el catálogo
            attributes: ['ID_DOM', 'NOMBRE'],
            // Opcional: ordenar por nombre para mejor usabilidad
            order: [['NOMBRE', 'ASC']]
        });
        
        // 2. Formatear los datos a { label: 'nombre', value: 'nombre' }
        const formattedDomains = dominios.map(d => ({
            label: d.NOMBRE,
            value: d.NOMBRE // El valor es el nombre completo del dominio
        }));

        // 3. Responder con el catálogo
        res.status(200).json(formattedDomains);
    } catch (error) {
        // 4. Manejar errores de base de datos o internos
        console.error('Error al obtener catálogo de dominios:', error);
        res.status(500).json({ message: 'Error interno al cargar la lista de dominios.' });
    }
};
