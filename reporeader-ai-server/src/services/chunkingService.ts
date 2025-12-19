/*
Chunking method
Uses the built-in TypeScript Compiler API to parse .ts, .tsx, .js and .jsx files
It creates a syntax tree (Abstract Syntax Tree). We will walk through that tree looking for FunctionalDeclaration, MethodDeclaration etc

An Abstract Syntax Tree is a hierarchical tree where
1. Each node represents a language construct
2. Unnecessary syntax (parentheses, commas, formatting) is removed
3. Only semantic structure is retained

It ignores whitespace, comments, formatting, each token position
*/

import ts from 'typescript';

export interface CodeChunk {
    type: 'function' | 'class' | 'other';
    name: string,
    content: string,
    startLine: number,
    endLine: number
}


// Takes filename and source code and returns a logical unit of code
export const chunkTypescriptCode = (sourceCode: string, fileName: string): CodeChunk[] => {
    const chunks: CodeChunk[] = [];
    const sourceFile = ts.createSourceFile(
        fileName,
        sourceCode,
        ts.ScriptTarget.Latest,
        true // enables parent pointers, important for traversal
    );

    // Visitor function, walks the tree
    const visit = (node: ts.Node) => {
        if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node)) {
            // Get the name (if it exists)
            // Arrow functions assigned to variables might not have a name property directly on the node,
            // but for simplicity in MVP, we try to grab what we can.
            let name = 'Anonymous';
            if ((node as any).name && ts.isIdentifier((node as any).name)) {
                name = (node as any).name.text;
            }

            // Get start and end Position
            const start = node.getStart(sourceFile);
            const end = node.getEnd();

            // Convert positions to Line Numbers (1-based index)
            const startLine = sourceFile.getLineAndCharacterOfPosition(start).line + 1;
            const endLine = sourceFile.getLineAndCharacterOfPosition(end).line + 1;

            //Actual content
            const content = sourceCode.substring(start, end);

            let type: 'function' | 'class' | 'other' = 'other';
            if (ts.isClassDeclaration(node)) type = 'class';
            else type = 'function';

            chunks.push({ type, name, content, startLine, endLine });
        }

        ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    // 4. Fallback: If no chunks were found (e.g. it's just a list of variables), 
    // or if it's a small file, just return the whole file as one chunk.
    if (chunks.length === 0 && sourceCode.trim().length > 0) {
        return chunkArbitraryFile(sourceCode, 100); // Fallback to line splitting
    }

    return chunks;
}


const chunkArbitraryFile = (sourceCode: string, maxLines = 50): CodeChunk[] => {
    const lines = sourceCode.split('\n');
    const chunks: CodeChunk[] = [];

    let currentLine = 1;

    for (let i = 0; i < lines.length; i += maxLines) {
        const endLine = Math.min(currentLine + maxLines - 1, lines.length);
        const chunkLines = lines.slice(i, i + maxLines);
        const content = chunkLines.join('\n');

        chunks.push({
            type: 'other',
            name: `Lines ${currentLine}-${endLine}`,
            content,
            startLine: currentLine,
            endLine: endLine
        });

        currentLine += maxLines;
    }

    return chunks;
};

export const chunkSourceCode = (sourceCode: string, fileName: string): CodeChunk[] => {
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (['ts', 'tsx', 'js', 'jsx'].includes(extension || '')) {
        return chunkTypescriptCode(sourceCode, fileName);
    } else {
        // Use generic splitter for Python, Java, MD, CSS, etc.
        return chunkArbitraryFile(sourceCode, 50); // 50 lines per chunk
    }
};