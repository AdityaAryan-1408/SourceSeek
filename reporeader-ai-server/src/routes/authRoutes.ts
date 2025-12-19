import { Router } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { register, login, getMe } from "../controllers/authController";
import { authenticateToken } from "../middleware/authMiddleware"

const router = Router();

// --- Standard Email/Password Auth ---
router.post("/register", register);
router.post("/login", login);

router.get("/me", authenticateToken, getMe);

// --- GitHub OAuth ---


// 1. Initiate
router.get(
    "/github",
    (req, res, next) => {
        console.log("[AuthRoutes] Starting GitHub OAuth flow...");
        next();
    },
    passport.authenticate("github", { scope: ["user:email"] })
);

// 2. Callback
router.get(
    "/github/callback",
    (req, res, next) => {
        console.log("[AuthRoutes] GitHub Callback hit. Authenticating...");
        passport.authenticate("github", { failureRedirect: "http://localhost:5173/auth?error=failed" })(req, res, next);
    },
    (req, res) => {
        console.log("[AuthRoutes] Authentication successful. Generating Token...");

        // If we are here, the user is successfully authenticated
        const user = req.user as any;

        if (!user) {
            console.error("[AuthRoutes] CRITICAL: req.user is missing!");
            return res.redirect("http://localhost:5173/auth?error=no_user");
        }

        try {
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                process.env.JWT_SECRET || "default_secret",
                { expiresIn: "24h" }
            );

            const redirectUrl = `http://localhost:5173/auth/callback?token=${token}`;
            console.log("[AuthRoutes] Redirecting to:", redirectUrl);

            res.redirect(redirectUrl);
        } catch (error) {
            console.error("[AuthRoutes] Token generation failed:", error);
            res.redirect("http://localhost:5173/auth?error=token_error");
        }
    }
);

export default router;