import fs from 'fs-extra';
import path from 'path';

export interface FileNode {
    path: string; // Path of the file in repo
    name: string; // name of file
    type: 'file' | 'directory';
    children?: FileNode[];
}

const IGNORED_FOLDERS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next']);
const IGNORED_FILES = new Set(['package-lock.json', 'yarn.lock', '.DS_Store', '.env']);

// Recursively walks the directory and builds a tree structure.
// Uses DFS

export const generateFileTree = async (dirPath: string, relativePath = ''): Promise<FileNode[]> => {
    const nodes: FileNode[] = [];
    const items = await fs.readdir(dirPath); // reads all items in a directory

    for (const item of items) {
        if (IGNORED_FILES.has(item) || IGNORED_FOLDERS.has(item)) continue;
        const fullPath = path.join(dirPath, item);
        const itemRelativePath = path.join(relativePath, item);

        const stats = await fs.stat(fullPath);
        if (stats.isDirectory()) {
            const children = await generateFileTree(fullPath, itemRelativePath);

            nodes.push({
                path: itemRelativePath,
                name: item,
                type: 'directory',
                children
            });
        } else {
            nodes.push({
                path: itemRelativePath,
                name: item,
                type: 'file'
            });
        }
    }
    return nodes;
}

export const processFile = async (filePath: string): Promise<string> => {
    // Read file content as UTF-8 string
    return await fs.readFile(filePath, 'utf-8');
};