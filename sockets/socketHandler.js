const { pool } = require('../config/databases'); 
const geoService = require('../services/geoValidation');

const connectedDrivers = {}; 
// MEMORIA VOLÁTIL PARA SOLICITUDES ACTIVAS (Escalabilidad rápida)
let activeTripRequests = [];

exports.initSocketIO = (io) => {
    io.on('connection', (socket) => {
        
        socket.on('driverConnect', async ({ driverId }) => {
            if (driverId) {
                socket.join(`driver_${driverId}`);
                socket.join('drivers_pool');
                connectedDrivers[driverId] = socket.id;
                
                // ACTUALIZACIÓN CRÍTICA: Al conectar, marcar como ONLINE
                try {
                    await pool.query(
                        'UPDATE "CONDUCTORES" SET "IS_ONLINE" = true WHERE "ID_COND" = $1', 
                        [driverId]
                    );
                } catch (e) { console.error("Error al poner online:", e); }

                socket.emit('initialTripRequests', activeTripRequests);
            }
        });

        // ESCUCHAR CUANDO UN CONDUCTOR RECHAZA (Para limpiar su vista local si es necesario)
        socket.on('rejectTrip', ({ tripId, driverId }) => {
            // Lógica para marcar que este conductor no quiere ver este viaje
            socket.emit('removeTripFromList', tripId);
        });

        socket.on('updateLocation', async (data) => {
            const { driverId, lat, lon } = data;
            if (!driverId || !lat || !lon) return;

            try {
                const validacion = await geoService.verSectorMapaGps(lat, lon);
                
                // ACTUALIZAR POSICIÓN EN LA TABLA CONDUCTORES
                await pool.query(
                  'UPDATE "CONDUCTORES" SET "UBICACION_LAT" = $1, "UBICACION_LON" = $2 WHERE "ID_COND" = $3',
                  [lat, lon, driverId]
                );

                if (!validacion.enZona) {
                    socket.emit('forced_logout', { mensaje: 'Estás fuera de la zona autorizada.' });
                    await pool.query('UPDATE "CONDUCTORES" SET "IS_ONLINE" = false WHERE "ID_COND" = $1', [driverId]);
                    return; 
                }
                
                socket.emit('locationUpdateSuccess', { zona: validacion.zona?.NOMBRE || 'Zona Activa' });
            } catch (error) { console.error("Error en updateLocation:", error); }
        });

        socket.on('disconnect', async () => {
            const driverId = Object.keys(connectedDrivers).find(key => connectedDrivers[key] === socket.id);
            if (driverId) {
                // Al desconectar, marcar como offline
                await pool.query('UPDATE "CONDUCTORES" SET "IS_ONLINE" = false WHERE "ID_COND" = $1', [driverId]);
                delete connectedDrivers[driverId];
            }
        });

        socket.on('cancelAcceptedTrip', ({ tripId, driverId }) => {
            console.log(`❌ Viaje ${tripId} cancelado por Driver ${driverId}. Re-publicando...`);
            
            // 1. Buscar el viaje en nuestra lista de "activos pero asignados"
            const tripIndex = activeTripRequests.findIndex(t => t.id === tripId);
            if (tripIndex !== -1) {
                activeTripRequests[tripIndex].status = 'WAITING';
                // 2. Notificar a todos los conductores nuevamente (Vuelve a la lista en tiempo real)
                global.io.to('drivers_pool').emit('newTripRequest', activeTripRequests[tripIndex]);
            }
        });
    });
};

exports.broadcastNewTrip = (tripData) => {
    const newTrip = {
        ...tripData,
        timestamp: Date.now(), // Para ordenarlos por antigüedad
        status: 'WAITING'
    };
    activeTripRequests.push(newTrip);
    // Notificar a todos en la sala de ventas
    global.io.to('drivers_pool').emit('newTripRequest', newTrip);
};
