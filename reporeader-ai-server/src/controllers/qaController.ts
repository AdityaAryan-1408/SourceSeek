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
        const repo = await prisma.repository.findUnique({
            where: { id: repoId }
        });

        if (!repo) {
            return res.status(404).json({ error: "Repository not found" });
        }

        const aiResponse = await generateAnswer(question, repoId);

        if (aiResponse.targetNode) {
            let normalized = aiResponse.targetNode.replace(/\\/g, '/');

            if (normalized.startsWith('/')) {
                normalized = normalized.substring(1);
            }

            console.log(`[QA] Normalized target: '${aiResponse.targetNode}' -> '${normalized}'`);
            aiResponse.targetNode = normalized;
        }

        return res.json(aiResponse);

    } catch (error) {
        console.error("[QA Controller] Error:", error);
        return res.status(500).json({ error: "Failed to generate answer" });
    }
};