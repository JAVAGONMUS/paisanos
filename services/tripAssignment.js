// ../services/tripAssignment.js

const { emitToSpecificDrivers } = require('../sockets/socketHandler'); // Cambiamos la importación
const mapboxService = require('./mapboxService');
const { pool } = require('../config/databases'); // 🔒 Requerido para la consulta PostGIS

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

        // 3. EMISIÓN DIRIGIDA A LOS SELECCIONADOS
        emitToSpecificDrivers(conductoresCercanos, tripPayload);

        return { success: true, notifiedCount: conductoresCercanos.length };
    } catch (error) {
        console.error('[Sala de Ventas] Error Fatal en asignación:', error);
        return { success: false };
    }
};

module.exports = { publishTripToPool };
