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
import { ingestionEvents } from "../lib/ingestionEmitter";

interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        userId: string;
        email: string;
    }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const emitUpdate = (repoId: string, message: string, progress: number, eta: string | null = null) => {
    ingestionEvents.emit(`progress-${repoId}`, {
        message,
        progress,
        eta,      
        timestamp: new Date().toLocaleTimeString()
    });
};

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
        emitUpdate(repoId, `Found ${filesToProcess.length} valid source files. Starting ingestion...`, 15);

        const BATCH_SIZE = 5;
        const totalFiles = filesToProcess.length;
        const startTime = Date.now();
        let processedCount = 0;

        for (let i = 0; i < totalFiles; i += BATCH_SIZE) {
            const batch = filesToProcess.slice(i, i + BATCH_SIZE);
            console.log(`[IngestWorker] Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} files)...`);
            const elapsedSeconds = (Date.now() - startTime) / 1000;
            const filesPerSecond = processedCount > 0 ? processedCount / elapsedSeconds : 0;
            const remainingFiles = totalFiles - processedCount;
            const etaSeconds = filesPerSecond > 0 ? Math.ceil(remainingFiles / filesPerSecond) : 0;
            
            const etaText = etaSeconds > 60 
                ? `${Math.floor(etaSeconds / 60)}m ${etaSeconds % 60}s` 
                : `${etaSeconds}s`;

            const currentProgress = 15 + Math.floor((processedCount / totalFiles) * 80);

            emitUpdate(
                repoId, 
                `Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} files)...`, 
                currentProgress, 
                filesPerSecond > 0 ? etaText : "Calculating..."
            );

            await Promise.all(
                batch.map(file => processSingleFile(file, tempPath, repoId))
            );

            processedCount += batch.length;
        }

        await prisma.repository.update({
            where: { id: repoId },
            data: { status: "COMPLETED" }
        });

        console.log(`[IngestWorker] Job Complete.`);
        emitUpdate(repoId, `Ingestion complete! Finalizing...`, 100, "Done");
        
        await sleep(1000);
        await fs.remove(tempPath);

    } catch (error) {
        console.error('[IngestWorker] FAILED:', error);
        await prisma.repository.update({ where: { id: repoId }, data: { status: "FAILED" } });
        await fs.remove(tempPath).catch(() => { });
    }
};
export const streamIngestionProgress = async (req: Request, res: Response) => {
    const { repoId } = req.params;

    console.log(`[SSE] Client connected for repo: ${repoId}`); // Debug log

    // 1. Set Headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders(); // Force headers to be sent immediately

    // 2. Send an IMMEDIATE "Handshake" message
    // This forces the frontend to switch from "Initializing..." to "Connected"
    const handshake = {
        message: "Connection established. Waiting for logs...",
        progress: 0,
        eta: "Calculating...",
        timestamp: new Date().toLocaleTimeString()
    };
    res.write(`data: ${JSON.stringify(handshake)}\n\n`);

    // 3. Define the event listener
    const onProgress = (data: any) => {
        // Log to server console to prove events are firing
        console.log(`[SSE] Emitting to ${repoId}:`, data.message); 
        
        res.write(`data: ${JSON.stringify(data)}\n\n`);
        
        // Use res.flush() if available (some compression middleware needs this)
        // @ts-ignore
        if (res.flush) res.flush();

        if (data.progress === 100 || data.message.includes("Error")) {
            res.end();
            ingestionEvents.off(`progress-${repoId}`, onProgress);
        }
    };

    // 4. Subscribe
    ingestionEvents.on(`progress-${repoId}`, onProgress);

    // 5. Cleanup
    req.on('close', () => {
        console.log(`[SSE] Client disconnected: ${repoId}`);
        ingestionEvents.off(`progress-${repoId}`, onProgress);
    });
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