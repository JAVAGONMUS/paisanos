// ../sockets/socketHandler.js
const jwt = require('jsonwebtoken'); // 🔒 AÑADIDO: Requerido para verificar el token
const { pool } = require('../config/databases'); 
const geoService = require('../services/geoValidation');
const Driver = require('../models/Driver');

// Usamos Map para mejor rendimiento en búsquedas/borrados que un objeto simple
const connectedDrivers = new Map(); 
let activeTripRequests = [];

exports.initSocketIO = (io) => {
    // Hacemos que io sea accesible globalmente si no lo estaba
    global.io = io;

    // 🔒 1. AUTENTICACIÓN DEL SOCKET (Handshake Middleware)
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        
        if (!token) {
            console.log("⚠️ Intento de conexión Socket sin token.");
            return next(new Error('Autenticación fallida: Token no proveído'));
        }

        try {
            // Verificamos el token con la misma llave secreta que tu API
            const verified = jwt.verify(token, process.env.JWT_SECRET);
            // Guardamos la información del usuario firmada en el objeto socket
            socket.user = verified; 
            next();
        } catch (err) {
            console.log("❌ Token inválido en Socket.");
            return next(new Error('Autenticación fallida: Token inválido'));
        }
    });

    io.on('connection', (socket) => {
        // Ahora sabemos con certeza quién es porque el token lo avala
        console.log(`🔌 Nuevo dispositivo conectado: ${socket.id} - Usuario ID: ${socket.user.id}`);

        socket.on('driverConnect', async (data) => {
            // 🔒 2. SEGURIDAD: Ya no usamos data.driverId. Usamos el ID del token.
            const driverId = socket.user.id; 
            
            if (!driverId) return;

            // 1. Limpieza de conexiones previas del mismo conductor (Evita duplicados)
            if (connectedDrivers.has(driverId)) {
                const oldSocketId = connectedDrivers.get(driverId);
                const oldSocket = io.sockets.sockets.get(oldSocketId);
                if (oldSocket) oldSocket.leave('drivers_pool');
            }

            // 2. Unirse a salas
            socket.join(`driver_room_${driverId}`); // Usa un prefijo claro
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
            // 🔒 3. SEGURIDAD: Obligamos a que la ubicación se registre a nombre del dueño del token
            const driverId = socket.user.id; 
            const { lat, lon, isOnline } = data; // Ignoramos data.driverId si el frontend lo envía
            
            if (!lat || !lon) return;

            try {
                const validacion = await geoService.verSectorMapaGps(lat, lon);

                // Actualización masiva: Lat, Lon y aseguramos que IS_ONLINE sea true
                await pool.query(
                  'UPDATE "CONDUCTORES" SET "UBICACION_LAT" = $1, "UBICACION_LON" = $2, "IS_ONLINE" = $3 WHERE "ID_COND" = $4',
                  [lat, lon, isOnline !== undefined ? isOnline : true, driverId]
                );

                if (!validacion.enZona) {
                    console.warn(`⚠️ Driver ${driverId} fuera de zona.`);
                    socket.emit('forced_logout', { 
                        reason: 'FUERA_DE_RANGO',
                        mensaje: 'Has salido del área de servicio de PAISANOS.' 
                    });
                    await pool.query('UPDATE "CONDUCTORES" SET "IS_ONLINE" = false WHERE "ID_COND" = $1', [driverId]);
                    socket.leave('drivers_pool');
                    return; 
                }

                socket.emit('locationUpdateSuccess', { 
                    zona: validacion.zona?.NOMBRE || 'Zona Activa',
                    timestamp: new Date()
                });
            } catch (error) { 
                console.error("❌ Error TigerData updateLocation:", error.message); 
            }
        });

        socket.on('rejectTrip', ({ tripId }) => {
            socket.emit('removeTripFromList', tripId);
        });

        socket.on('cancelAcceptedTrip', ({ tripId }) => {
            const driverId = socket.user.id; // Por seguridad
            console.log(`❌ Viaje ${tripId} rechazado tras aceptación por Driver ${driverId}.`);
            const tripIndex = activeTripRequests.findIndex(t => t.id === tripId);
            
            if (tripIndex !== -1) {
                activeTripRequests[tripIndex].status = 'WAITING';
                io.to('drivers_pool').emit('newTripRequest', activeTripRequests[tripIndex]);
            }
        });

        socket.on('disconnect', async () => {
            const disconnectedDriverId = socket.user.id; // Lo tenemos directo del token
            
            console.log(`👋 Conductor ${disconnectedDriverId} desconectado.`);
            try {
                await pool.query('UPDATE "CONDUCTORES" SET "IS_ONLINE" = false WHERE "ID_COND" = $1', [disconnectedDriverId]);
                connectedDrivers.delete(disconnectedDriverId);
            } catch (e) {
                console.error("Error al marcar offline en desconexión:", e.message);
            }
        });
    });
};

exports.broadcastNewTrip = (tripData) => {
    const newTrip = {
        ...tripData,
        timestamp: Date.now(),
        status: 'WAITING'
    };
    activeTripRequests = activeTripRequests.filter(t => t.id !== tripData.id);
    activeTripRequests.push(newTrip);
    if (global.io) {
        global.io.to('drivers_pool').emit('newTripRequest', newTrip);
    }
};

// Función para enviar viaje SOLO a los conductores más cercanos
exports.emitToSpecificDrivers = (driverIds, tripData) => {
    const newTrip = {
        ...tripData,
        timestamp: Date.now(),
        status: 'WAITING'
    };
    
    // Evitar duplicados en la lista global de activos
    activeTripRequests = activeTripRequests.filter(t => t.id !== tripData.id);
    activeTripRequests.push(newTrip);

    if (global.io) {
        // Emitimos un evento exclusivamente a las salas personales de los elegidos
        driverIds.forEach(driverId => {
            global.io.to(`driver_room_${driverId}`).emit('newTripRequest', newTrip);
        });
        console.log(`📡 [MULTICAST] Viaje ${tripData.id} enviado a ${driverIds.length} conductores cercanos.`);
    }
};
