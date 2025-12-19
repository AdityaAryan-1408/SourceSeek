import { Request, Response } from "express";
import { generateAnswer } from "../services/aiService";
import prisma from "../lib/prisma";

export const chatWithRepo = async (req: Request, res: Response): Promise<any> => {
    const { repoId } = req.params;
    const { question } = req.body;

    if (!question) {
        return res.status(400).json({ error: "Question is required" });
    }

    try {
        // 1. Verify Repo exists
        const repo = await prisma.repository.findUnique({
            where: { id: repoId }
        });

        if (!repo) {
            return res.status(404).json({ error: "Repository not found" });
        }

        // 2. Call the AI Service
        const aiResponse = await generateAnswer(question, repoId);

        // 3. SANITIZATION FIX: Normalize the path to match React Flow IDs
        // The graph uses "src/index.ts" (forward slashes, no leading slash)
        if (aiResponse.targetNode) {
            // Replace backslashes with forward slashes
            let normalized = aiResponse.targetNode.replace(/\\/g, '/');

            // Remove leading slash if present (e.g. "/src/file.ts" -> "src/file.ts")
            if (normalized.startsWith('/')) {
                normalized = normalized.substring(1);
            }

            console.log(`[QA] Normalized target: '${aiResponse.targetNode}' -> '${normalized}'`);
            aiResponse.targetNode = normalized;
        }

        // 4. Return the response
        return res.json(aiResponse);

    } catch (error) {
        console.error("[QA Controller] Error:", error);
        return res.status(500).json({ error: "Failed to generate answer" });
    }
};