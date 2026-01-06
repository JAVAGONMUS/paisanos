const Departamento = require('../models/Departamento');
const Municipio = require('../models/Municipio'); 
const { pool } = require('../config/databases');

// Obtener el ID de país por defecto
const DEFAULT_COUNTRY_ID = process.env.DEFAULT_COUNTRY_ID; 

/**
 * Obtiene el catálogo de departamentos y municipios para los formularios
 */
const getUbicaciones = async (req, res) => {
    if (!DEFAULT_COUNTRY_ID) {
        return res.status(500).json({ message: 'Error: DEFAULT_COUNTRY_ID no está configurado en .env.' });
    }

    try {        
        const departamentos = await Departamento.findAll({
            where: { ID_PAIS: DEFAULT_COUNTRY_ID },
            attributes: ['ID_DEP', 'NOMBRE', 'CODIGO'], 
            include: [{
                model: Municipio,
                as: 'municipios', 
                attributes: ['ID_MUN', 'NOMBRE'],
            }],
            order: [['NOMBRE', 'ASC']],
        });

        res.status(200).json(departamentos);

    } catch (error) {
        console.error('Error al cargar catálogo de ubicaciones:', error);
        res.status(500).json({ message: 'Error interno al obtener el catálogo.' });
    }
};

/**
 * Actualiza la ubicación actual del conductor y registra el historial (Transacción SQL)
 */
const actualizarUbicacionConductor = async (req, res) => {
    const { lat, lon, id_cond } = req.body;

    if (!lat || !lon || !id_cond) {
        return res.status(400).json({ message: "Faltan parámetros requeridos (lat, lon, id_cond)" });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // 🚀 INICIO TRANSACCIÓN

        // 1. Actualizar tabla CONDUCTORES
        const updateQuery = `
            UPDATE CONDUCTORES 
            SET UBICACION_LAT = $1, UBICACION_LON = $2, UPDATED_AT = NOW()
            WHERE ID_COND = $3;
        `;
        await client.query(updateQuery, [lat, lon, id_cond]);

        // 2. Insertar en HISTORIAL_GPS
        const insertHistorialQuery = `
            INSERT INTO HISTORIAL_GPS (ID_COND, UBICACION_LAT, UBICACION_LON, CREATED_AT)
            VALUES ($1, $2, $3, NOW());
        `;
        await client.query(insertHistorialQuery, [id_cond, lat, lon]);

        await client.query('COMMIT'); // ✅ CONFIRMAR CAMBIOS
        
        res.status(200).json({ success: true, message: "Ubicación e historial registrados." });

    } catch (error) {
        await client.query('ROLLBACK'); // ❌ REVERTIR EN CASO DE ERROR
        console.error("Error crítico en transacción GPS:", error);
        res.status(500).json({ success: false, message: "Error al guardar en base de datos." });
    } finally {
        client.release();
    }
};

// EXPORTACIÓN ÚNICA (Esto evita el error de Railway)
module.exports = {
    getUbicaciones,
    actualizarUbicacionConductor
};
