import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
    // 1. Check for Authorization Header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No Token Provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // 2. Verify Token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key_123');

        // 3. Attach User to Request
        req.user = decoded; // { userId, email, ... }
        next();
    } catch (error) { // eslint-disable-line no-unused-vars
        // console.error('[Auth Middleware] Invalid Token:', error.message);
        return res.status(403).json({ error: 'Forbidden: Invalid Token' });
    }
};
