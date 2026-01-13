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
    const { lat, lon, id_cond, velocidad, esInicioSesion } = req.body;

    if (!lat || !lon || !id_cond) {
        return res.status(400).json({ message: "Faltan parámetros requeridos" });
    }

    // --- VALIDACIÓN DE VELOCIDAD (ALERTA) ---
    const LIMITE_VELOCIDAD = 100;
    if (velocidad && parseFloat(velocidad) > LIMITE_VELOCIDAD) {
        console.log(`⚠️ ALERTA: El conductor ${id_cond} va a ${velocidad} km/h (Exceso de velocidad)`);
        // Aquí podrías insertar en una tabla de 'ALERTAS' en el futuro
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Actualizar tabla CONDUCTORES (Tiempo Real)
        // Cambiamos IS_ONLINE a true y actualizamos coordenadas y velocidad
        const updateQuery = `
            UPDATE CONDUCTORES 
            SET UBICACION_LAT = $1, 
                UBICACION_LON = $2, 
                VELOCIDAD = $3, 
                IS_ONLINE = true, 
                UPDATED_AT = NOW()
            WHERE ID_COND = $4;
        `;
        await client.query(updateQuery, [lat, lon, velocidad || 0, id_cond]);

        // 2. Insertar en HISTORIAL_GPS solo si es el primer registro del login
        if (esInicioSesion === true) {
            const insertHistorialQuery = `
                INSERT INTO HISTORIAL_GPS (ID_COND, UBICACION_LAT, UBICACION_LON, CREATED_AT)
                VALUES ($1, $2, $3, NOW());
            `;
            await client.query(insertHistorialQuery, [id_cond, lat, lon]);
            console.log(`📍 Check-in inicial registrado para conductor ${id_cond}`);
        }

        await client.query('COMMIT');
        res.status(200).json({ success: true, alertaVelocidad: velocidad > LIMITE_VELOCIDAD });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error crítico en actualización de estado/GPS:", error);
        res.status(500).json({ success: false });
    } finally {
        client.release();
    }
};

// EXPORTACIÓN ÚNICA (Esto evita el error de Railway)
module.exports = {
    getUbicaciones,
    actualizarUbicacionConductor
};
