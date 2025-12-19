import { Request, Response } from "express";
import simpleGit from "simple-git";
import path from "path";
import fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";
import { generateFileTree, processFile } from "../services/fileService";
import { chunkSourceCode } from "../services/chunkingService";
import { generateEmbedding } from "../services/aiService";
import prisma from "../lib/prisma";
import { getRepoFileCount } from "../services/githubService";

interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        userId: string;
        email: string;
    }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const generateEmbeddingWithRetry = async (text: string, retries = 3): Promise<number[] | null> => {
    for (let i = 0; i < retries; i++) {
        try {
            return await generateEmbedding(text);
        } catch (error: any) {
            const isRateLimit = error.message?.includes('429') || error.status === 429;

            if (isRateLimit && i < retries - 1) {
                console.warn(`[AI] Rate limit hit. Retrying in ${(i + 1) * 2}s...`);
                await sleep((i + 1) * 2000);
                continue;
            }

            console.error(`[AI] Embedding failed:`, error.message);
            return null;
        }
    }
    return null;
};

const processSingleFile = async (file: any, tempPath: string, repoId: string) => {
    try {
        const fullPath = path.join(tempPath, file.path);
        const content = await processFile(fullPath);

        if (!content || content.length > 30000) return null;

        const fileRecord = await prisma.repoFile.create({
            data: { filePath: file.path, repoId: repoId }
        });

        const chunks = chunkSourceCode(content, file.name);

        for (const chunk of chunks) {
            const vector = await generateEmbeddingWithRetry(chunk.content);

            if (!vector) continue;


            await prisma.$executeRaw`
                INSERT INTO "CodeChunk" ("id", "fileId", "startLine", "endLine", "content", "vector", "createdAt")
                VALUES (
                    ${uuidv4()}, 
                    ${fileRecord.id}, 
                    ${chunk.startLine}, 
                    ${chunk.endLine}, 
                    ${chunk.content}, 
                    ${JSON.stringify(vector)}::vector, 
                    NOW()
                )
            `;


            await sleep(100);
        }

        return true;
    } catch (err) {
        console.warn(`[IngestWorker] Error processing ${file.path}:`, err);
        return false;
    }
};

const performIngestion = async (repoId: string, repoUrl: string, tempPath: string) => {
    try {
        console.log(`[IngestWorker] Starting background job for: ${repoUrl}`);
        await simpleGit().clone(repoUrl, tempPath);

        const fileTree = await generateFileTree(tempPath);
        const flattenFiles = (nodes: any[]): any[] => {
            let files: any[] = [];
            for (const node of nodes) {
                if (node.type === 'file') files.push(node);
                else if (node.children) files = files.concat(flattenFiles(node.children));
            }
            return files;
        }

        const allFiles = flattenFiles(fileTree);

        const IGNORED_EXTENSIONS = new Set([
            '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.json',
            '.lock', '.md', '.txt', '.map', '.css', '.scss', '.html',
            '.xml', '.yml', '.yaml', '.config', '.toml', '.csv', '.editorconfig', '.gitignore'
        ]);

        const filesToProcess = allFiles.filter(file => {
            if (file.path.includes('node_modules') ||
                file.path.includes('.git') ||
                file.path.includes('dist') ||
                file.path.includes('build') ||
                file.path.includes('coverage')) return false;

            const ext = path.extname(file.name).toLowerCase();
            return !IGNORED_EXTENSIONS.has(ext);
        });

        console.log(`[IngestWorker] Filtered down to ${filesToProcess.length} valid files.`);

        const BATCH_SIZE = 5;

        for (let i = 0; i < filesToProcess.length; i += BATCH_SIZE) {
            const batch = filesToProcess.slice(i, i + BATCH_SIZE);
            console.log(`[IngestWorker] Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} files)...`);

            await Promise.all(
                batch.map(file => processSingleFile(file, tempPath, repoId))
            );
        }

        await prisma.repository.update({
            where: { id: repoId },
            data: { status: "COMPLETED" }
        });

        console.log(`[IngestWorker] Job Complete.`);
        await fs.remove(tempPath);

    } catch (error) {
        console.error('[IngestWorker] FAILED:', error);
        await prisma.repository.update({ where: { id: repoId }, data: { status: "FAILED" } });
        await fs.remove(tempPath).catch(() => { });
    }
};

export const ingestRepo = async (req: Request, res: Response): Promise<any> => {
    const { repoUrl, repoName } = req.body;
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.userId;

    const existing = await prisma.repository.findFirst({
        where: {
            userId: userId,
            url: repoUrl
        }
    });

    if (existing) {
        return res.status(200).json({
            message: "Repository already exists",
            id: existing.id,
            status: existing.status
        });
    }

    if (!userId) return res.status(401).json({ error: "User not authenticated" });
    if (!repoName || !repoUrl) return res.status(400).json({ error: "Missing Name/URL" });

    const FILE_LIMIT = 300;
    const fileCount = await getRepoFileCount(repoUrl);

    if (fileCount > FILE_LIMIT) {
        return res.status(400).json({
            error: 'REPO_TOO_LARGE',
            message: `This repository has ${fileCount} source files. The Free Tier limit is ${FILE_LIMIT} files.`,
            fileCount
        });
    }

    try {
        const repo = await prisma.repository.create({
            data: {
                name: repoName,
                url: repoUrl,
                userId: userId,
                status: "INGESTING"
            }
        });

        const processingId = uuidv4();
        const tempPath = path.join(__dirname, '../../temp', processingId);


        performIngestion(repo.id, repoUrl, tempPath);

        return res.status(200).json({
            message: "Ingestion started.",
            id: repo.id,
            status: "INGESTING"
        });

    } catch (error) {
        console.error('[Ingest] Failed to start:', error);
        return res.status(500).json({ error: "Failed to start ingestion" });
    }
}