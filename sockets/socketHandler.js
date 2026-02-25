const { pool } = require('../config/databases'); 
const geoService = require('../services/geoValidation');

// Usamos Map para mejor rendimiento en búsquedas/borrados que un objeto simple
const connectedDrivers = new Map(); 
let activeTripRequests = [];

exports.initSocketIO = (io) => {
    // Hacemos que io sea accesible globalmente si no lo estaba
    global.io = io;

    io.on('connection', (socket) => {
        console.log(`🔌 Nuevo dispositivo conectado: ${socket.id}`);
        
        socket.on('driverConnect', async ({ driverId }) => {
            if (!driverId) return;

            // 1. Limpieza de conexiones previas del mismo conductor (Evita duplicados)
            if (connectedDrivers.has(driverId)) {
                const oldSocketId = connectedDrivers.get(driverId);
                const oldSocket = io.sockets.sockets.get(oldSocketId);
                if (oldSocket) oldSocket.leave('drivers_pool');
            }

            // 2. Unirse a salas
            socket.join(`driver_${driverId}`);
            socket.join('drivers_pool');
            connectedDrivers.set(driverId, socket.id);
            
            console.log(`✅ Conductor ${driverId} unido a salas y pool.`);

            // 3. Actualización en TigerData (IS_ONLINE)
            try {
                await pool.query(
                    'UPDATE "CONDUCTORES" SET "IS_ONLINE" = true WHERE "ID_COND" = $1', 
                    [driverId]
                );
                // Enviamos los viajes pendientes solo a este conductor que entra
                socket.emit('initialTripRequests', activeTripRequests);
            } catch (e) { 
                console.error("❌ Error en DB al conectar conductor:", e.message); 
            }
        });

        socket.on('updateLocation', async (data) => {
            const { driverId, lat, lon } = data;
            if (!driverId || !lat || !lon) return;

            try {
                // Validación Geográfica (PostGIS/GeoService)
                const validacion = await geoService.verSectorMapaGps(lat, lon);
                
                // Actualización de coordenadas en TigerData
                await pool.query(
                  'UPDATE "CONDUCTORES" SET "UBICACION_LAT" = $1, "UBICACION_LON" = $2 WHERE "ID_COND" = $3',
                  [lat, lon, driverId]
                );

                if (!validacion.enZona) {
                    console.warn(`⚠️ Driver ${driverId} fuera de zona.`);
                    socket.emit('forced_logout', { mensaje: 'Estás fuera de la zona autorizada de PAISANOS.' });
                    await pool.query('UPDATE "CONDUCTORES" SET "IS_ONLINE" = false WHERE "ID_COND" = $1', [driverId]);
                    socket.leave('drivers_pool');
                    return; 
                }
                
                socket.emit('locationUpdateSuccess', { 
                    zona: validacion.zona?.NOMBRE || 'Zona Activa',
                    timestamp: new Date()
                });
            } catch (error) { 
                console.error("❌ Error en updateLocation:", error.message); 
            }
        });

        socket.on('rejectTrip', ({ tripId }) => {
            // El conductor no quiere ver este viaje, se lo quitamos de SU vista
            socket.emit('removeTripFromList', tripId);
        });

        socket.on('cancelAcceptedTrip', ({ tripId, driverId }) => {
            console.log(`❌ Viaje ${tripId} rechazado tras aceptación por Driver ${driverId}.`);
            
            const tripIndex = activeTripRequests.findIndex(t => t.id === tripId);
            if (tripIndex !== -1) {
                activeTripRequests[tripIndex].status = 'WAITING';
                // Notificar a todo el pool para que alguien más lo tome
                io.to('drivers_pool').emit('newTripRequest', activeTripRequests[tripIndex]);
            }
        });

        socket.on('disconnect', async () => {
            // Buscamos al driverId por el ID del socket
            let disconnectedDriverId = null;
            for (let [id, sId] of connectedDrivers.entries()) {
                if (sId === socket.id) {
                    disconnectedDriverId = id;
                    break;
                }
            }

            if (disconnectedDriverId) {
                console.log(`👋 Conductor ${disconnectedDriverId} desconectado.`);
                try {
                    await pool.query('UPDATE "CONDUCTORES" SET "IS_ONLINE" = false WHERE "ID_COND" = $1', [disconnectedDriverId]);
                    connectedDrivers.delete(disconnectedDriverId);
                } catch (e) {
                    console.error("Error al marcar offline en desconexión:", e.message);
                }
            }
        });
    });
};

// Función para cuando un cliente crea un viaje desde el controlador de rutas
exports.broadcastNewTrip = (tripData) => {
    const newTrip = {
        ...tripData,
        timestamp: Date.now(),
        status: 'WAITING'
    };
    
    // Evitar duplicados en la lista de activos
    activeTripRequests = activeTripRequests.filter(t => t.id !== tripData.id);
    activeTripRequests.push(newTrip);

    if (global.io) {
        global.io.to('drivers_pool').emit('newTripRequest', newTrip);
    }
};
