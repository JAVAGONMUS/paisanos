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
        req.user = verified; // Aquí req.user.id es el ID_COND

        // Ajuste de Seguridad: Verificamos id_cond en body, params o query
        const idCondPeticion = req.body.id_cond || req.params.id_cond || req.query.id_cond;
        
        // Si hay un ID en la petición, debe ser igual al del Token
        if (idCondPeticion && String(idCondPeticion) !== String(req.user.id)) {
            console.log(`⚠️ Alerta: Token ID (${req.user.id}) no coincide con Body ID (${idCondPeticion})`);
            return res.status(403).json({ 
                success: false, 
                message: 'Violación de seguridad: Identidad no verificada.' 
            });
        }

        next();
    } catch (err) {
        res.status(403).json({ success: false, message: 'Token inválido.' });
    }
};

module.exports = verifyToken;
