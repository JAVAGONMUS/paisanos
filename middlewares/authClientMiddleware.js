const jwt = require('jsonwebtoken');

const authClientMiddleware = (req, res, next) => {
    // Obtenemos el token del header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Acceso denegado. Se requiere token de cliente.' });
    }

    try {
        // 🔒 Usamos ESTRICTAMENTE la llave de clientes
        const verified = jwt.verify(token, process.env.JWT_SECRET_CLIENT);
        
        // Verificación extra opcional: Asegurar que el rol en el token sea de cliente
        if (verified.rol !== 'CLIENTE') {
            return res.status(403).json({ success: false, message: 'Token no autorizado para este módulo.' });
        }

        req.user = verified;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Token de cliente inválido o expirado.' });
    }
};

module.exports = authClientMiddleware;