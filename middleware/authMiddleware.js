const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ message: 'Acceso denegado. No hay token proporcionado.' });
    }

    try {
        // El token viene típicamente como 'Bearer TOKEN_STRING'. Extraemos solo el token.
        const tokenString = token.replace('Bearer ', '');
        const verified = jwt.verify(tokenString, process.env.JWT_SECRET);
        
        // Adjuntamos el payload decodificado al objeto request
        req.user = verified; 
        next();
    } catch (err) {
        res.status(400).json({ message: 'Token inválido o expirado.' });
    }
};

module.exports = verifyToken;
