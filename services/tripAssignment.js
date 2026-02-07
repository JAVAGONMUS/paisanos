const { broadcastNewTrip } = require('../sockets/socketHandler');
const mapboxService = require('./mapboxService');

/**
 * Publica una solicitud de servicio en la sala de ventas de PAISANOS.
 */
const publishTripToPool = async (tripData) => {
    try {
        console.log(`[Sala de Ventas] Publicando viaje ${tripData.id}...`);

        // Obtenemos un estimado inicial (puede ser desde el centro de la zona)
        const estimado = await mapboxService.obtenerTiempoRealLlegada(
            tripData.pickup_lat, tripData.pickup_lng,
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
            pickupCoords: [tripData.pickup_lng, tripData.pickup_lat],
            destCoords: [tripData.dest_lng, tripData.dest_lat],
            etaToClient: 5, // Estimado base
            tripDuration: estimado ? estimado.minutos : 15,
            rating: tripData.client_rating || 5.0,
            timestamp: Date.now()
        };

        // Enviamos a través del socket handler a la sala global
        broadcastNewTrip(tripPayload);

        return { success: true };
    } catch (error) {
        console.error('[Sala de Ventas] Error:', error);
        return { success: false };
    }
};

module.exports = { publishTripToPool };
