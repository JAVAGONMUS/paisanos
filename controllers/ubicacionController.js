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
    console.log(`📡 Intentando actualizar GPS -> ID_COND: ${id_cond}, Latitud: ${lat}, Longitud: ${lon}, Velocidad: ${velocidad}, EsInicioSesion:${esInicioSesion}`);
    if (!lat || !lon || !id_cond) {
        console.error("❌ Error: Faltan parámetros en el body");
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
                UPDATED_AT = NOW(),
                LAST_UPDATED = NOW()
            WHERE ID_COND = $4
            RETURNING ID_COND;
        `;
        
        const resUpdate = await client.query(updateQuery, [
            parseFloat(lat), 
            parseFloat(lon), 
            parseFloat(velocidad) || 0, 
            parseInt(id_cond)
        ]);

        if (resUpdate.rowCount === 0) {
            console.error(`⚠️ Advertencia: No se encontró ningún conductor con ID_COND: ${id_cond} en Postgres.`);
        } else {
            console.log(`✅ Tabla CONDUCTORES actualizada para ID: ${id_cond}`);
        }

        // 3. Historial GPS
        if (esInicioSesion === true || esInicioSesion === 'true') {
            const insertHistorialQuery = `
                INSERT INTO "HISTORIAL_GPS" (ID_COND, UBICACION_LAT, UBICACION_LON, CREATED_AT)
                VALUES ($1, $2, $3, NOW());
            `;
            await client.query(insertHistorialQuery, [parseInt(id_cond), parseFloat(lat), parseFloat(lon)]);
            console.log(`📍 Historial insertado correctamente.`);
        }

        await client.query('COMMIT');
        res.status(200).json({ success: true });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("❌ ERROR CRÍTICO EN POSTGRES:", error.message);
        console.error("Detalle del error:", error.stack);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
};

// EXPORTACIÓN ÚNICA (Esto evita el error de Railway)
module.exports = {
    getUbicaciones,
    actualizarUbicacionConductor
};
