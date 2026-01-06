const { pool } = require('../config/databases'); // Usamos pool para transacciones directas en Postgres
const Driver = require('../models/Driver');

// Mapas en memoria para rapidez de respuesta
const connectedDrivers = {}; 

exports.initSocketIO = (io) => {
    io.on('connection', (socket) => {
        console.log(`📡 Cliente conectado al Socket: ${socket.id}`);

        // 1. Identificación del Conductor
        socket.on('driverConnect', ({ driverId }) => {
            if (driverId) {
                socket.join(`driver_${driverId}`);
                connectedDrivers[driverId] = socket.id;
                console.log(`✅ Conductor ${driverId} enlazado al socket.`);
            }
        });

        // 2. ACTUALIZACIÓN GPS EN TIEMPO REAL (Con Transacción Inviolable)
        socket.on('updateLocation', async (data) => {
            const { driverId, lat, lon } = data;
            
            if (!driverId || !lat || !lon) return;

            const client = await pool.connect(); // Iniciamos conexión de Postgres

            try {
                await client.query('BEGIN'); // 🚀 INICIO DE TRANSACCIÓN

                // A. Actualizar ubicación actual en tabla CONDUCTORES
                const updateDriverQuery = `
                    UPDATE CONDUCTORES 
                    SET UBICACION_LAT = $1, UBICACION_LON = $2, IS_ONLINE = true 
                    WHERE ID_COND = $3
                `;
                await client.query(updateDriverQuery, [lat, lon, driverId]);

                // B. Insertar en HISTORIAL_GPS para auditoría y seguridad
                const insertHistoryQuery = `
                    INSERT INTO HISTORIAL_GPS (ID_COND, UBICACION_LAT, UBICACION_LON, CREATED_AT)
                    VALUES ($1, $2, $3, NOW())
                `;
                await client.query(insertHistoryQuery, [driverId, lat, lon]);

                await client.query('COMMIT'); // ✅ TODO EXITOSO

                // Notificar éxito al APP del conductor (Pone el letrero en VERDE)
                socket.emit('locationUpdateSuccess', { status: 'Conectado y listo' });

                // Emitir a clientes cercanos o administradores
                io.emit('driverLocationUpdate', { driverId, lat, lon });

            } catch (error) {
                await client.query('ROLLBACK'); // ❌ ERROR: Revertir todo
                console.error('⚠️ ERROR CRÍTICO GPS:', error);

                // Notificar error al APP (Pone el letrero en ROJO)
                socket.emit('location_update_error', { 
                    message: 'Error con los datos de ubicación en el sistema, comuníquese con soporte técnico' 
                });
            } finally {
                client.release();
            }
        });

        // 3. Respuesta a Solicitudes de Viaje
        socket.on('tripResponse', (data) => {
            const { tripId, driverId, response } = data;
            console.log(`🚖 Conductor ${driverId} ${response} el viaje ${tripId}`);
            
            // Emitir al sistema de monitoreo o al cliente solicitante
            io.emit('driverResponse', { tripId, driverId, response });
        });

        // 4. Desconexión
        socket.on('disconnect', () => {
            const driverId = Object.keys(connectedDrivers).find(key => connectedDrivers[key] === socket.id);
            if (driverId) {
                delete connectedDrivers[driverId];
                console.log(`🛑 Conductor ${driverId} desconectado del socket.`);
            }
        });
    });
};

/**
 * Función para enviar una solicitud de viaje a un conductor específico
 */
exports.sendTripRequest = (driverId, tripData) => {
    const socketId = connectedDrivers[driverId];
    if (socketId) {
        // Usamos el ID del socket almacenado para enviar la alerta privada
        global.io.to(socketId).emit('newTripRequest', tripData);
        return true;
    }
    return false;
};
