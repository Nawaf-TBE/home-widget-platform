import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'platform-secret-2025';

export interface AuthenticatedRequest extends Request {
    user?: {
        sub: string;
    };
}

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.sendStatus(403);
            }
            const payload = decoded as { sub?: string; id?: string };
            // Normalize: prefer sub, fall back to id for backwards compatibility
            const sub = payload.sub || payload.id;
            if (!sub) {
                return res.sendStatus(403);
            }
            (req as AuthenticatedRequest).user = { sub };
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

export const generateToken = (userId: string) => {
    // Sign JWT with 'sub' claim (standard JWT subject identifier)
    return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '1h' });
};
