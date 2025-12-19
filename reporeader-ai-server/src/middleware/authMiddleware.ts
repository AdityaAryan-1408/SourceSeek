import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Fix: Combine the Global User type (has 'id') with your Controller needs (has 'userId')
export interface AuthRequest extends Request {
    user?: Express.User & { userId: string };
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): any => {
    // 1. Get the header
    const authHeader = req.headers['authorization'];

    // 2. Extract token (Split "Bearer <token>")
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        // console.log("[Auth] No token found in header");
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        // 3. Verify using the fallback 'secret' to match authController
        const secret = process.env.JWT_SECRET || 'secret';

        const decoded = jwt.verify(token, secret) as { userId: string; email: string };

        // 4. Attach user to request
        // CRITICAL FIX: We map 'userId' to 'id' to satisfy Passport/Global types,
        // but keep 'userId' so your existing controllers don't break.
        (req as AuthRequest).user = {
            id: decoded.userId,      // For Passport/Global compliance
            userId: decoded.userId,  // For Controller compatibility
            email: decoded.email
        };

        next();
    } catch (err) {
        console.error("[Auth] Token verification failed:", err);
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};