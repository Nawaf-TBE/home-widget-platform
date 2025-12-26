import { Response, NextFunction } from 'express';
import jwt, { JwtPayload, VerifyErrors } from 'jsonwebtoken';
import { Request } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'platform-secret-2025';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        role: string;
    };
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, JWT_SECRET, (err: VerifyErrors | null, user: JwtPayload | string | undefined) => {
            if (err) {
                return res.sendStatus(403);
            }

            req.user = user as { id: string; role: string };
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

// Helper to generate token for tests
export const generateToken = (payload: object) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
};
