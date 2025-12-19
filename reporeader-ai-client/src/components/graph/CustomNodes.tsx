import { Handle, Position } from 'reactflow';
import { Folder, FileCode, FileJson, FileType, File, Database } from 'lucide-react'; // Import Database icon

// 1. Folder Node
const FolderNode = ({ data }: any) => {
    return (
        <div className="px-4 py-2 shadow-xl rounded-lg bg-slate-900 border-2 border-slate-700 min-w-[150px] flex items-center gap-3 transition-all hover:border-cyan-500/50">
            {/* Target Handle (Top) */}
            <Handle type="target" position={Position.Top} className="!bg-slate-500 !w-2 !h-2" />

            <div className="p-2 rounded bg-slate-800 text-yellow-500">
                <Folder size={16} />
            </div>
            <div className="flex flex-col">
                <span className="text-slate-200 text-sm font-semibold tracking-wide">{data.label}</span>
            </div>

            {/* Source Handle (Bottom) */}
            <Handle type="source" position={Position.Bottom} className="!bg-slate-500 !w-2 !h-2" />
        </div>
    );
};

// 2. File Node
const FileNode = ({ data }: any) => {
    // Determine icon based on extension
    const ext = data.label.split('.').pop();
    let Icon = File;
    let color = "text-slate-400";

    if (['ts', 'tsx', 'js', 'jsx'].includes(ext)) { Icon = FileCode; color = "text-blue-400"; }
    else if (['json', 'yml'].includes(ext)) { Icon = FileJson; color = "text-yellow-400"; }
    else if (['css', 'html'].includes(ext)) { Icon = FileType; color = "text-orange-400"; }

    return (
        <div className="px-3 py-2 shadow-md rounded-md bg-slate-950 border border-slate-800 min-w-[120px] flex items-center gap-2 hover:border-cyan-500/50 transition-colors group">
            <Handle type="target" position={Position.Top} className="!bg-slate-600 !w-1.5 !h-1.5" />

            <Icon size={14} className={color} />
            <span className="text-slate-400 text-xs font-mono group-hover:text-cyan-300 transition-colors truncate max-w-[150px]">
                {data.label}
            </span>
        </div>
    );
};

const RootNode = ({ data }: any) => {
    return (
        <div className="px-6 py-3 shadow-2xl rounded-xl bg-slate-900 border-2 border-blue-500 min-w-[180px] flex items-center justify-center gap-3 shadow-blue-500/20">
            {/* No Target Handle (It's the root) */}

            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                <Database size={20} />
            </div>
            <span className="text-white text-lg font-bold tracking-wide">
                {data.label}
            </span>

            {/* Source Handle (Bottom) */}
            <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-3 !h-3" />
        </div>
    );
};

// 3. Export the Mapping
export const nodeTypes = {
    root: RootNode,
    folder: FolderNode,
    file: FileNode,
};