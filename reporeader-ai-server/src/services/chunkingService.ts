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


export const chunkTypescriptCode = (sourceCode: string, fileName: string): CodeChunk[] => {
    const chunks: CodeChunk[] = [];
    const sourceFile = ts.createSourceFile(
        fileName,
        sourceCode,
        ts.ScriptTarget.Latest,
        true 
    );


    const visit = (node: ts.Node) => {
        if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node)) {
            
            let name = 'Anonymous';
            if ((node as any).name && ts.isIdentifier((node as any).name)) {
                name = (node as any).name.text;
            }

    
            const start = node.getStart(sourceFile);
            const end = node.getEnd();

    
            const startLine = sourceFile.getLineAndCharacterOfPosition(start).line + 1;
            const endLine = sourceFile.getLineAndCharacterOfPosition(end).line + 1;

         
            const content = sourceCode.substring(start, end);

            let type: 'function' | 'class' | 'other' = 'other';
            if (ts.isClassDeclaration(node)) type = 'class';
            else type = 'function';

            chunks.push({ type, name, content, startLine, endLine });
        }

        ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    
    if (chunks.length === 0 && sourceCode.trim().length > 0) {
        return chunkArbitraryFile(sourceCode, 100);
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
       
        return chunkArbitraryFile(sourceCode, 50);
    }
};