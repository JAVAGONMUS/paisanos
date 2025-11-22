const Driver = require('../models/Driver'); // Asume que Driver.js existe
// Puedes usar el modelo de Viaje aquí, si lo tienes.

// Función de distancia Haversine (cálculo rápido para distancias cortas)
const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radio de la Tierra en kilómetros
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distancia en km
};

/**
 * Lógica central para encontrar y notificar a los conductores.
 * @param {object} io - Instancia de Socket.io Server.
 * @param {object} tripData - { id, pickup_lat, pickup_lng, radio_busqueda_km, ... }
 * @param {object} connectedDrivers - Mapa { driverId: socketId } de sockets conectados.
 */
const assignTrip = async (io, tripData, connectedDrivers) => {
    const SEARCH_RADIUS_KM = tripData.radio_busqueda_km || 5; // Radio por defecto de 5km
    const { id: tripId, pickup_lat, pickup_lng } = tripData;
    
    console.log(`[Asignación] Buscando conductores para viaje ${tripId} en radio de ${SEARCH_RADIUS_KM} km.`);

    try {
        // 1. Obtener conductores disponibles (solo los que están 'disponible')
        const availableDrivers = await Driver.findAll({ 
            where: { status: 'disponible' },
            attributes: ['driver_id', 'current_lat', 'current_lng']
        });
        
        let nearbyDrivers = [];

        // 2. Filtrar por distancia y asegurar que estén conectados por Socket.io
        for (const driver of availableDrivers) {
            const driverId = driver.driver_id;
            const driverSocketId = connectedDrivers[driverId];

            if (driverSocketId && driver.current_lat && driver.current_lng) {
                const distance = getDistanceFromLatLonInKm(
                    pickup_lat,
                    pickup_lng,
                    parseFloat(driver.current_lat),
                    parseFloat(driver.current_lng)
                );

                if (distance <= SEARCH_RADIUS_KM) {
                    nearbyDrivers.push({ driverId, distance, socketId: driverSocketId });
                }
            }
        }

        if (nearbyDrivers.length === 0) {
            console.log(`[Asignación] No hay conductores disponibles cerca para el viaje ${tripId}.`);
            // Lógica para notificar al cliente que no se encontró conductor.
            return { success: false, message: 'No drivers found.' };
        }

        // 3. Ordenar por el más cercano y enviar solicitud
        nearbyDrivers.sort((a, b) => a.distance - b.distance);
        
        const targetDriver = nearbyDrivers[0]; // El conductor más cercano
        const driverRoom = `driver_${targetDriver.driverId}`;

        // Enviar la solicitud a la "room" específica del conductor más cercano
        io.to(driverRoom).emit('newTripRequest', { 
            tripId, 
            pickupLocation: { lat: pickup_lat, lng: pickup_lng },
            // ... otros datos del viaje que el conductor necesita
            distanceToClient: targetDriver.distance.toFixed(2)
        });

        console.log(`[Asignación] Solicitud enviada a Conductor ${targetDriver.driverId} (Distancia: ${targetDriver.distance.toFixed(2)} km)`);
        
        // Aquí se iniciaría un temporizador para reasignar si no hay respuesta.
        return { success: true, driverId: targetDriver.driverId };

    } catch (error) {
        console.error('[Asignación] Error al asignar viaje:', error);
        return { success: false, message: 'Internal server error.' };
    }
};

module.exports = { assignTrip };
