import { Request, Response } from "express";
import prisma from "../lib/prisma";

// Interface for Status Check Params
interface RepoParams {
    repoId: string;
}

// 1. Get All Repos for the Current User (For the Dashboard)
export const getUserRepos = async (req: Request, res: Response): Promise<any> => {
    // @ts-ignore - We know user exists because of middleware
    const userId = req.user?.userId;

    try {
        const repos = await prisma.repository.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(repos);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch repositories" });
    }
};

// 2. Get Status of a Single Repo
export const getRepoStatus = async (req: Request<RepoParams>, res: Response): Promise<any> => {
    const { repoId } = req.params;

    if (!repoId) {
        return res.status(400).json({ error: "Repository ID is required" });
    }

    try {
        const repo = await prisma.repository.findUnique({
            where: { id: repoId },
            select: {
                status: true,
                url: true,
                name: true
            }
        });

        if (!repo) {
            return res.status(404).json({ error: "Repository not found" });
        }

        res.json(repo);

    } catch (error) {
        console.error("Error fetching status:", error);
        res.status(500).json({ error: "Failed to fetch status" });
    }
};
export const deleteRepo = async (req: Request, res: Response): Promise<any> => {
    const { repoId } = req.params;
    // @ts-ignore
    const userId = req.user?.userId;

    try {
        // Ensure the repo belongs to the user before deleting
        const repo = await prisma.repository.findFirst({
            where: { id: repoId, userId }
        });

        if (!repo) {
            return res.status(404).json({ error: "Repository not found or unauthorized" });
        }

        // Delete the repo (Cascading delete will handle related files/chunks if configured in Prisma schema)
        // If cascading isn't set up, we just delete the repo entry for now.
        await prisma.repository.delete({
            where: { id: repoId }
        });

        return res.json({ message: "Repository deleted successfully" });

    } catch (error) {
        console.error("Error deleting repo:", error);
        return res.status(500).json({ error: "Failed to delete repository" });
    }
};

export const getRepoGraph = async (req: Request, res: Response): Promise<any> => {
    const { repoId } = req.params;

    try {
        // 1. Fetch Repo Name & Files
        const repo = await prisma.repository.findUnique({
            where: { id: repoId },
            select: { name: true }
        });

        const files = await prisma.repoFile.findMany({
            where: { repoId },
            select: { id: true, filePath: true }
        });

        if (!repo) return res.status(404).json({ error: "Repo not found" });

        const nodesMap = new Map();
        const edgesMap = new Map();

        // 2. Create the Root Node
        const rootId = "ROOT";
        nodesMap.set(rootId, {
            id: rootId,
            type: 'root', // Special type for styling
            data: { label: repo.name },
            position: { x: 0, y: 0 }
        });

        // 3. Build Tree
        files.forEach((file) => {
            const normalizedPath = file.filePath.replace(/\\/g, '/');
            const parts = normalizedPath.split('/');
            let currentPath = "";

            parts.forEach((part, index) => {
                const parentPath = currentPath; // Previous iteration's path
                currentPath = currentPath ? `${currentPath}/${part}` : part;
                const isFile = index === parts.length - 1;

                // A. Create Node
                if (!nodesMap.has(currentPath)) {
                    nodesMap.set(currentPath, {
                        id: currentPath,
                        type: isFile ? 'file' : 'folder',
                        data: {
                            label: part,
                            dbId: isFile ? file.id : null
                        },
                        position: { x: 0, y: 0 }
                    });
                }

                // B. Create Edge
                // If we have a parent path, connect to it.
                // IF NOT (it's top level), connect to ROOT.
                const sourceId = parentPath ? parentPath : rootId;
                const targetId = currentPath;
                const edgeId = `e-${sourceId}-${targetId}`;

                if (!edgesMap.has(edgeId)) {
                    edgesMap.set(edgeId, {
                        id: edgeId,
                        source: sourceId,
                        target: targetId,
                        type: 'default',
                        animated: true,
                        style: { stroke: '#475569', strokeWidth: 2 }
                    });
                }
            });
        });

        const nodes = Array.from(nodesMap.values());
        const edges = Array.from(edgesMap.values());

        res.json({ nodes, edges });

    } catch (error) {
        console.error("Error fetching graph:", error);
        res.status(500).json({ error: "Failed to fetch graph data" });
    }
};

export const getFileContent = async (req: Request, res: Response): Promise<any> => {
    const { fileId } = req.params;

    try {
        const chunks = await prisma.codeChunk.findMany({
            where: { fileId },
            orderBy: { startLine: 'asc' },
            select: { content: true }
        });

        if (!chunks || chunks.length === 0) {
            return res.status(404).json({ error: "File content not found" });
        }

        const fullContent = chunks.map(c => c.content).join('\n');
        res.json({ content: fullContent });
    } catch (error) {
        console.error("Error fetching file content:", error);
        res.status(500).json({ error: "Failed to fetch content" });
    }
};
