import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { AuthRequest } from "../middleware/authMiddleware";

export const register = async (req: Request, res: Response): Promise<any> => {
    const { email, password } = req.body;

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash: hashedPassword,
            },
        });

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '1h' }
        );

        // FIXED: Removed 'name: user.name'
        res.status(201).json({
            token,
            user: { id: user.id, email: user.email }
        });

    } catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
};

export const login = async (req: Request, res: Response): Promise<any> => {
    const { email, password } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '1h' }
        );

        // FIXED: Removed 'name: user.name'
        res.json({
            token,
            user: { id: user.id, email: user.email }
        });

    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
};

export const getMe = async (req: Request, res: Response): Promise<any> => {
    try {
        // The authMiddleware attaches 'user' to the request
        const authReq = req as AuthRequest;

        if (!authReq.user || !authReq.user.userId) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        const user = await prisma.user.findUnique({
            where: { id: authReq.user.userId },
            select: {
                id: true,
                email: true,
                // Add name if your schema has it, otherwise omit or use email
                // name: true, 
            }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Return the profile in the format the frontend expects
        res.json({
            id: user.id,
            email: user.email,
            name: user.email.split('@')[0] // Fallback name generation
        });

    } catch (error) {
        console.error("GetMe Error:", error);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
};