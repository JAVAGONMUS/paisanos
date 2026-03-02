//  ../middlewares/authMiddleware.js

const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            success: false, 
            message: 'Acceso denegado.' 
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        
        // Adjuntamos el objeto verificado a req.user
        // verified contiene: { id, userId, role }
        req.user = verified; 

        // --- AJUSTE DE SEGURIDAD ---
        // Buscamos id_cond en cualquier parte de la petición
        const idCondPeticion = req.body.id_cond || req.params.id_cond || req.query.id_cond;
        
        // Si la petición trae un id_cond, validamos que pertenezca al dueño del token
        if (idCondPeticion && String(idCondPeticion) !== String(req.user.id)) {
            console.log(`⚠️ ALERTA DE SEGURIDAD: Token ID (${req.user.id}) != Petición ID (${idCondPeticion})`);
            return res.status(403).json({ 
                success: false, 
                message: 'Violación de seguridad: Identidad no verificada.' 
            });
        }

        next();
    } catch (err) {
        // Diferenciamos si el token expiró o es simplemente falso
        const message = err.name === 'TokenExpiredError' ? 'Sesión expirada.' : 'Token inválido.';
        res.status(403).json({ success: false, message });
    }
};

module.exports = verifyToken;
