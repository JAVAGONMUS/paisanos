const Dominio = require('../models/Dominio');

exports.getDomains = async (req, res) => {
    try {
        // 1. Buscar todos los dominios
        const dominios = await Dominio.findAll({
            attributes: ['ID_DOM', 'NOMBRE'], 
            order: [['NOMBRE_DOMINIO', 'ASC']] 
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
