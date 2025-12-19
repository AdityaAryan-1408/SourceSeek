// This is a simplified example. A real repo would be much larger.
// We're defining nodes for a simple structure:
// reporeader-ai/
// ├── src/
// │   ├── components/
// │   │   └── Button.tsx
// │   ├── auth/
// │   │   └── index.ts
// │   └── App.tsx
// └── package.json

// We need to export these types for react-flow
export interface NodeData {
    label: string
    isExpandable?: boolean
}

// Nodes represent the files and folders
export const mockNodes = [
    {
        id: 'root',
        data: { label: 'reporeader-ai' },
        position: { x: 400, y: 25 }, // Centered root
        type: 'rootNode'
    },
    {
        id: 'src',
        data: { label: 'src', isExpandable: true },
        position: { x: 300, y: 150 },
        type: 'folderNode'
    },
    {
        id: 'pkg-json',
        data: { label: 'package.json' },
        position: { x: 500, y: 150 },
        type: 'fileNode'
    },
    {
        id: 'components',
        data: { label: 'components', isExpandable: true },
        position: { x: 100, y: 275 }, // <-- Moved far left
        type: 'folderNode'
    },
    {
        id: 'auth',
        data: { label: 'auth', isExpandable: true },
        position: { x: 300, y: 275 }, // <-- Stays in middle
        type: 'folderNode'
    },
    {
        id: 'app-tsx',
        data: { label: 'App.tsx' },
        position: { x: 500, y: 275 }, // <-- Moved to the right
        type: 'fileNode'
    },
    {
        id: 'button-tsx',
        data: { label: 'Button.tsx' },
        position: { x: 100, y: 400 }, // <-- Aligned under 'components'
        type: 'fileNode'
    },
    {
        id: 'auth-index',
        data: { label: 'index.ts' },
        position: { x: 300, y: 400 }, // <-- Aligned under 'auth'
        type: 'fileNode'
    },
];

// Edges represent the connections (lines) between them
export const mockEdges = [
    { id: 'e-root-src', source: 'root', target: 'src', animated: true },
    { id: 'e-root-pkg', source: 'root', target: 'pkg-json', animated: true },
    { id: 'e-src-comp', source: 'src', target: 'components' },
    { id: 'e-src-auth', source: 'src', target: 'auth' },
    { id: 'e-src-app', source: 'src', target: 'app-tsx' },
    { id: 'e-comp-btn', source: 'components', target: 'button-tsx' },
    { id: 'e-auth-idx', source: 'auth', target: 'auth-index' },
]