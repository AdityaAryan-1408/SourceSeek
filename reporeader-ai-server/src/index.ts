import express, { Express, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs-extra"; // Import fs-extra for cleanup
import path from "path";     // Import path to locate the folder

import authRoutes from "./routes/authRoutes";
import repoRoutes from "./routes/repoRoutes";
import ingestRoutes from './routes/ingestRoutes';
// Import qaRoutes (We will create this shortly, adding it now to avoid coming back)
import qaRoutes from "./routes/qaRoutes";
import './lib/passport';
import session from 'express-session';
import passport from 'passport';




dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5555;

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());

app.use(session({
    secret: process.env.JWT_SECRET || 'keyboard_cat_secret',
    resave: false,
    saveUninitialized: false,
}))

app.use(passport.initialize());
app.use(passport.session());

app.get("/api/health", (req: Request, res: Response) => {
    res.status(200).json({ status: "Active", message: "Systems Online" });
});

app.use("/auth", authRoutes);
app.use("/api/repos", repoRoutes);
app.use("/api/ingest", ingestRoutes);
app.use("/api/chat", qaRoutes); 

app.get("/", (req: Request, res: Response) => {
    res.send("SourceSeek is Running");
});


const cleanupTempDir = async () => {
    const tempPath = path.join(__dirname, '../temp');
    try {
       
        await fs.ensureDir(tempPath);
        await fs.emptyDir(tempPath);
        console.log(`[Server] Temp directory cleared: ${tempPath}`);
    } catch (error) {
        console.error(`[Server] Failed to clean temp directory:`, error);
    }
};

cleanupTempDir().then(() => {
    app.listen(port, () => {
        console.log(`[server]: Server is running at http://localhost:${port}`);
    });
});