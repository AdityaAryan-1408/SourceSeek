import { Router } from "express";
import { chatWithRepo } from "../controllers/qaController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

// POST /api/chat/:repoId
// We protect this route so only logged-in users can ask questions
router.post("/:repoId", authenticateToken, chatWithRepo);

export default router;