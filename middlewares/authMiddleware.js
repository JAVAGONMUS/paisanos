const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
    // 1. Obtener el token del header
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            success: false, 
            message: 'Acceso denegado. Formato de token inválido o inexistente.' 
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        // 2. Verificar autenticidad del token
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        
        // Adjuntamos el payload decodificado (que contiene id, permisos, etc.)
        req.user = verified;

        // 3. SEGURIDAD DE IDENTIDAD (Cross-Check)
        // Si la petición trae un id_cond (como en las rutas de GPS), 
        // validamos que sea el mismo del Token.
        const idCondEnBody = req.body.id_cond || req.params.id_cond;
        
        if (idCondEnBody && String(idCondEnBody) !== String(req.user.id)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Violación de seguridad: El ID del conductor no coincide con el token.' 
            });
        }

        next();
    } catch (err) {
        console.error("Error en validación de Token:", err.message);
        res.status(403).json({ 
            success: false, 
            message: 'Sesión inválida o expirada. Por favor, inicie sesión de nuevo.' 
        });
    }
};

module.exports = verifyToken;
