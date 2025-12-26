import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
    };
}

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }
            (req as AuthenticatedRequest).user = user as { id: string };
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

export const generateToken = (userId: string) => {
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1h' });
};
