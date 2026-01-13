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
    // 1. Extraemos con posibles variantes para no fallar
    const { 
        lat, Latitud, 
        lon, Longitud, 
        id_cond, 
        velocidad, Velocidad,
        esInicioSesion, EsInicioSesion 
    } = req.body;

    // 2. Normalizamos los datos (si viene como 'Latitud', lo asignamos a 'finalLat')
    const finalLat = lat || Latitud;
    const finalLon = lon || Longitud;
    const finalVel = velocidad !== undefined ? velocidad : (Velocidad !== undefined ? Velocidad : 0);
    const finalEsInicio = esInicioSesion || EsInicioSesion;

    // LOG DE DEPURACIÓN INTERNA
    console.log(`🔍 Validando -> Lat: ${finalLat}, Lon: ${finalLon}, ID: ${id_cond}`);

    // 3. Verificamos los datos normalizados
    if (!finalLat || !finalLon || !id_cond) {
        console.error("❌ Error: Faltan parámetros. Recibido:", req.body);
        return res.status(400).json({ 
            message: "Faltan parámetros requeridos",
            recibido: req.body 
        });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Actualización en CONDUCTORES
        const updateQuery = `
            UPDATE CONDUCTORES 
            SET UBICACION_LAT = $1, 
                UBICACION_LON = $2, 
                VELOCIDAD = $3, 
                IS_ONLINE = true, 
                UPDATED_AT = NOW(),
                LAST_UPDATED = NOW()
            WHERE ID_COND = $4
        `;
        
        const result = await client.query(updateQuery, [
            parseFloat(finalLat), 
            parseFloat(finalLon), 
            parseFloat(finalVel), 
            id_cond
        ]);

        console.log(`✅ Resultado Update: ${result.rowCount} filas afectadas.`);

        // Historial si es inicio de sesión
        if (finalEsInicio === true || finalEsInicio === 'true') {
            const insertHistorial = `
                INSERT INTO "HISTORIAL_GPS" (ID_COND, UBICACION_LAT, UBICACION_LON, CREATED_AT)
                VALUES ($1, $2, $3, NOW())
            `;
            await client.query(insertHistorial, [id_cond, parseFloat(finalLat), parseFloat(finalLon)]);
            console.log("📍 Historial guardado.");
        }

        await client.query('COMMIT');
        res.status(200).json({ success: true });

    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error("❌ ERROR EN SQL:", error.message);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        if (client) client.release();
    }
};

// EXPORTACIÓN ÚNICA (Esto evita el error de Railway)
module.exports = {
    getUbicaciones,
    actualizarUbicacionConductor
};
