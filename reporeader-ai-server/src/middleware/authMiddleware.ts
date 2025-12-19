import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: Express.User & { userId: string };
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): any => {

    const authHeader = req.headers['authorization'];

    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {

        return res.status(401).json({ error: 'Access token required' });
    }

    try {

        const secret = process.env.JWT_SECRET || 'secret';

        const decoded = jwt.verify(token, secret) as { userId: string; email: string };

        (req as AuthRequest).user = {
            id: decoded.userId,      
            userId: decoded.userId,  
            email: decoded.email
        };

        next();
    } catch (err) {
        console.error("[Auth] Token verification failed:", err);
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};