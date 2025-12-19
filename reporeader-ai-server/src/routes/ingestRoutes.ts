import { Router } from "express";
import { ingestRepo } from "../controllers/ingestController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = Router();

router.post("/", authenticateToken, ingestRepo);

export default router;