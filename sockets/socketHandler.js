const Driver = require('../models/Driver');

// Mapa para rastrear los sockets activos de los conductores
// { driverId: socketId }
const connectedDrivers = {}; 
// Mapa para rastrear la ubicación y estado de los conductores
// { driverId: { lat, lng, status } }
const driverLocations = {}; 

exports.initSocketIO = (io) => {
  io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    // 1. El conductor se conecta y se identifica
    // Se envía desde el cliente: io.emit('driverConnect', { driverId: 123 })
    socket.on('driverConnect', ({ driverId }) => {
      // Usar un "Room" por conductor simplifica el envío directo de notificaciones.
      socket.join(`driver_${driverId}`); 
      connectedDrivers[driverId] = socket.id;
      console.log(`Conductor ID ${driverId} conectado y en room: driver_${driverId}`);
    });


    // 2. El conductor envía su ubicación en tiempo real
    socket.on('updateLocation', async (data) => {
      // data: { driverId: number, lat: number, lng: number }
      const { driverId, lat, lng } = data;

      if (driverId) {
        driverLocations[driverId] = { lat, lng, timestamp: Date.now() };

        // **Actualizar la ubicación en la DB** (Recomendado: hacer esto menos frecuente, p.ej. cada 1 min, o solo al iniciar el viaje)
        try {
            await Driver.update({ current_lat: lat, current_lng: lng }, { where: { driver_id: driverId } });
        } catch (error) {
            console.error('Error al actualizar DB location:', error);
        }

        // Emitir la ubicación a un room de "clientes cercanos" si existiera, o al sistema de monitoreo.
        io.emit('driverLocationUpdate', { driverId, lat, lng });
      }
    });

    // 3. El conductor acepta o rechaza una solicitud de viaje
    socket.on('tripResponse', (data) => {
      // data: { tripId: number, driverId: number, response: 'accept' | 'reject' }
      const { tripId, driverId, response } = data;
      
      console.log(`Conductor ${driverId} respondió ${response} al viaje ${tripId}`);
      
      // Aquí iría la Lógica de Asignación de Viajes (F)
      // - Si acepta: Actualizar el estado del viaje en DB, notificar al cliente (ej: io.to(`client_${tripId}`).emit('tripAssigned', ...)), actualizar estado del conductor a 'en_viaje'.
      // - Si rechaza: Intentar asignar a otro conductor disponible.
      io.emit('driverResponse', { tripId, driverId, response }); // Notificar al sistema central
    });

    // 4. Desconexión
    socket.on('disconnect', () => {
      const driverId = Object.keys(connectedDrivers).find(key => connectedDrivers[key] === socket.id);
      if (driverId) {
        delete connectedDrivers[driverId];
        // Opcional: Actualizar el estado del conductor en la DB a 'no_disponible'
        console.log(`Conductor ID ${driverId} desconectado.`);
      }
      console.log(`Cliente desconectado: ${socket.id}`);
    });
  });
};

/**
 * Lógica de Asignación de Viajes (Ejemplo de función centralizada)
 * @param {object} tripData - Datos del viaje, incluyendo lat/lng del cliente.
 */
exports.assignTripToDriver = async (tripData) => {
    // 1. Obtener conductores disponibles (status = 'disponible')
    const availableDrivers = await Driver.findAll({ where: { status: 'disponible' } });
    
    // 2. Filtrar por radio de búsqueda
    // ITERAR sobre availableDrivers: Usar fórmulas de distancia (Haversine) entre tripData.lat/lng y driverLocations[driverId].lat/lng
    
    // 3. Asignar el viaje (Ejemplo: al más cercano o al primero encontrado)
    const closestDriver = availableDrivers[0]; 

    if (closestDriver && connectedDrivers[closestDriver.driver_id]) {
        const driverSocketId = connectedDrivers[closestDriver.driver_id];
        
        // Enviar la solicitud de viaje al conductor
        io.to(driverSocketId).emit('newTripRequest', { 
            tripId: tripData.id,
            pickup: tripData.pickupLocation,
            dropoff: tripData.dropoffLocation,
            // ... otros datos
        });
        
        // Establecer un temporizador para esperar la respuesta (si no responde, reasignar)
    } else {
        // Notificar al cliente que no hay conductores.
    }
};
