import express, { Express, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs-extra";
import path from "path";

import authRoutes from "./routes/authRoutes";
import repoRoutes from "./routes/repoRoutes";
import ingestRoutes from "./routes/ingestRoutes";
import qaRoutes from "./routes/qaRoutes";

import session from "express-session";
import passport from "passport";
import "./lib/passport";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5555;

app.set("trust proxy", 1);

const allowedOrigins = [
    "http://localhost:5173",
    "https://source-seek.vercel.app",
    "https://source-seek-6bmq.vercel.app",
    "https://source-seek-6bmq-cgb1oqlss-aditya-aryans-projects-c0c4577c.vercel.app/",
    "https://source-seek-6bmq-git-main-aditya-aryans-projects-c0c4577c.vercel.app/",
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or server-to-server)
        if (!origin) return callback(null, true);

        // A. Check if it's in the fixed list (Localhost or Main Domain)
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // B. Dynamic Check for Vercel Preview URLs
        // Allows any URL that ends with ".vercel.app" AND contains your project name
        if (origin.endsWith('.vercel.app') && origin.includes('source-seek')) {
            return callback(null, true);
        }

        // C. Block everything else
        console.log("Blocked by CORS:", origin); // Check Render logs if you still have issues
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
}));
app.use(express.json());


app.use(
    session({
        name: "sourceseek.sid",
        secret: process.env.JWT_SECRET || "keyboard_cat_secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: true,      // REQUIRED for HTTPS (Vercel + Render)
            sameSite: "none",  // REQUIRED for cross-origin cookies
            maxAge: 1000 * 60 * 60 * 24 // 1 day
        }
    })
);

app.use(passport.initialize());
app.use(passport.session());


app.get("/api/health", (req: Request, res: Response) => {
    res.status(200).json({ status: "Active", message: "Systems Online" });
});

app.use("/auth", authRoutes);
app.use("/api/repos", repoRoutes);
app.use("/api/ingest", ingestRoutes);
app.use("/api/chat", qaRoutes);

app.get("/", (_req: Request, res: Response) => {
    res.send("SourceSeek is Running");
});

const cleanupTempDir = async () => {
    const tempPath = path.join(__dirname, "../temp");
    try {
        await fs.ensureDir(tempPath);
        await fs.emptyDir(tempPath);
        console.log(`[Server] Temp directory cleared: ${tempPath}`);
    } catch (error) {
        console.error("[Server] Temp cleanup failed:", error);
    }
};


cleanupTempDir().then(() => {
    app.listen(port, () => {
        console.log(`[server]: Running on port ${port}`);
    });
});
