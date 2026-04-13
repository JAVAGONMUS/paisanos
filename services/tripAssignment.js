// ../services/tripAssignment.js
const { emitToSpecificDrivers } = require('../sockets/socketHandler'); 
const mapboxService = require('./mapboxService');
const { pool } = require('../config/databases');
const Viajes = require('../models/Viajes');

/**
 * Filtra conductores espacialmente y publica la solicitud dirigida.
 */
const publishTripToPool = async (tripData) => {
    try {
        console.log(`[Sala de Ventas] Procesando viaje ${tripData.id}...`);

        // 1. CONSULTA ESPACIAL RÁPIDA (PostGIS)
        // Buscamos conductores con IS_ONLINE = true en un radio de 3 km (3000 metros)
        const query = `
            SELECT "ID_COND"
            FROM "CONDUCTORES"
            WHERE "IS_ONLINE" = true
            AND ST_DWithin(
                ST_SetSRID(ST_MakePoint("UBICACION_LON", "UBICACION_LAT"), 4326)::geography,
                ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                3000 -- Radio en metros (Ajustable según tu lógica de negocio)
            )
            LIMIT 5; -- Límite de choferes a notificar simultáneamente
        `;
        
        const pickupLng = tripData.pickup_lng;
        const pickupLat = tripData.pickup_lat;
        
        // Ejecutamos la búsqueda espacial
        const dbResult = await pool.query(query, [pickupLng, pickupLat]);
        
        // Extraemos solo los IDs en un arreglo simple: [15, 8, 42]
        const conductoresCercanos = dbResult.rows.map(row => row.ID_COND);

        if (conductoresCercanos.length === 0) {
            console.warn(`⚠️ [Sala de Ventas] No hay tuctucs cercanos en 3km para el viaje ${tripData.id}`);
            // Aquí podrías implementar una lógica para ampliar el radio a 5km y reintentar,
            // o simplemente devolver un aviso al cliente.
            return { success: false, message: "No hay conductores en el área." };
        }

        // 2. OBTENER ESTIMADO DE MAPBOX
        const estimado = await mapboxService.obtenerTiempoRealLlegada(
            pickupLat, pickupLng,
            tripData.dest_lat, tripData.dest_lng
        );

        const tripPayload = {
            id: tripData.id,
            clientName: tripData.client_name,
            clientPhoto: tripData.client_photo,
            fare: tripData.amount,
            currency: tripData.currency || 'Q',
            pickupAddress: tripData.pickup_address,
            destinationAddress: tripData.dest_address,
            pickupCoords: [pickupLng, pickupLat],
            destCoords: [tripData.dest_lng, tripData.dest_lat],
            etaToClient: 3, // Opcional: Podrías calcular esto cruzando el GPS del chofer más cercano
            tripDuration: estimado ? estimado.minutos : 15,
            rating: tripData.client_rating || 5.0,
            timestamp: Date.now()
        };

        await Viajes.create({
            ID_VIAJE: tripData.id,
            CLIENTE_NOMBRE: tripData.client_name,
            ESTADO: 'PENDIENTE',
            PICKUP_LAT: pickupLat,
            PICKUP_LON: pickupLng,
            DEST_LAT: tripData.dest_lat,
            DEST_LON: tripData.dest_lng,
            TARIFA: tripData.amount
        });

        // 3. EMISIÓN DIRIGIDA A LOS SELECCIONADOS
        emitToSpecificDrivers(conductoresCercanos, tripPayload);

        setTimeout(async () => {
            try {
                // Intentamos pasar de PENDIENTE a EXPIRADO
                const queryExpiracion = `
                    UPDATE "VIAJES"
                    SET "ESTADO" = 'EXPIRADO'
                    WHERE "ID_VIAJE" = $1 AND "ESTADO" = 'PENDIENTE'
                    RETURNING *;
                `;
                const expRes = await pool.query(queryExpiracion, [tripData.id]);

                if (expRes.rowCount === 1) {
                    console.log(`⏰ Viaje ${tripData.id} expiró tras 30 segundos sin respuesta.`);
                    
                    // Avisar a los choferes que quiten la tarjeta de su pantalla
                    if (global.io) {
                        global.io.to('drivers_pool').emit('tripExpired', { tripId: tripData.id });
                    }
                    
                    // Aquí podrías avisar al cliente que no se encontraron conductores
                    // o disparar una función recursiva para volver a buscar en un radio de 5km.
                }
            } catch (err) {
                console.error("Error en expiración automática:", err);
            }
        }, 30000); // 30,000 ms = 30 segundos

        return { success: true, notifiedCount: conductoresCercanos.length };
    } catch (error) {
        console.error('[Sala de Ventas] Error Fatal en asignación:', error);
        return { success: false };
    }
};

module.exports = { publishTripToPool };
