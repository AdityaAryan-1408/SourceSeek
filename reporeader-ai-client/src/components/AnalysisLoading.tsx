import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, Terminal, Cpu, Database, Network, Minimize2 } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/useAppStore"; 

const STEPS = [
    { id: 1, label: 'Cloning Repository...', icon: Network, duration: 2000 },
    { id: 2, label: 'Parsing File Structure...', icon: Terminal, duration: 1500 },
    { id: 3, label: 'Generating AST Nodes...', icon: Cpu, duration: 2500 },
    { id: 4, label: 'Vectorizing Code Chunks...', icon: Database, duration: 3000 },
    { id: 5, label: 'Finalizing Knowledge Graph...', icon: CheckCircle2, duration: 1000 },
];

interface AnalysisLoadingProps {
    onBackground: () => void;
}

export const AnalysisLoading = ({ onBackground }: AnalysisLoadingProps) => {
    
    const currentStep = useAppStore((state) => state.analysisCurrentStep);
    const setCurrentStep = useAppStore((state) => state.setAnalysisCurrentStep);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;

        const runSteps = (index: number) => {
            if (index >= STEPS.length) return;

           
            if (index > currentStep) {
                setCurrentStep(index);
            }

 
            const nextIndex = Math.max(index, currentStep) + 1;

            const delay = index < currentStep ? 0 : STEPS[index].duration;

            timeout = setTimeout(() => {
                runSteps(nextIndex);
            }, delay);
        };

        runSteps(currentStep);

        return () => clearTimeout(timeout);
    }, []); 

    return (
        <div className="fixed inset-0 z-50 bg-[#0a0f1e]/90 backdrop-blur-md flex flex-col items-center justify-center p-4 font-mono">

            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 relative overflow-hidden shadow-2xl"
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-scan" />

                <div className="flex flex-col items-center mb-8">
                    <div className="relative mb-4">
                        <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-20 animate-pulse"></div>
                        <Logo className="w-12 h-12 relative z-10" />
                    </div>
                    <h2 className="text-xl text-white font-bold tracking-wider">SYSTEM INITIALIZING</h2>
                    <p className="text-xs text-cyan-400 mt-1">INGESTING REPOSITORY DATA</p>
                </div>

                <div className="space-y-4">
                    {STEPS.map((step, index) => {
                        const Icon = step.icon;
                        const isActive = index === currentStep;
                        const isCompleted = index < currentStep;

                        return (
                            <div
                                key={step.id}
                                className={`flex items-center gap-3 transition-all duration-500 ${isActive || isCompleted ? 'opacity-100' : 'opacity-30 blur-[1px]'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${isActive
                                    ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                                    : isCompleted
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                        : 'bg-slate-800 border-slate-700 text-slate-500'
                                    }`}>
                                    {isActive ? (
                                        <Loader2 className="animate-spin" size={16} />
                                    ) : (
                                        <Icon size={16} />
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className={`text-sm ${isActive ? 'text-white' : 'text-slate-400'}`}>
                                        {step.label}
                                    </span>
                                    {isActive && (
                                        <span className="text-[10px] text-cyan-500/80 animate-pulse">
                                            Processing...
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8 relative h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                        className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-cyan-500 to-blue-600"
                        initial={{ width: "0%" }}
                        animate={{ width: `${Math.min(((currentStep + 1) / STEPS.length) * 100, 100)}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>

                <div className="mt-6 flex justify-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onBackground}
                        className="text-slate-400 hover:text-white hover:bg-slate-800 gap-2"
                    >
                        <Minimize2 size={16} />
                        Run in Background
                    </Button>
                </div>

            </motion.div>

            <div className="mt-8 font-mono text-xs text-slate-500 text-center space-y-1">
                <p>Allocating vector space...</p>
                <p>Connection established: secure</p>
            </div>

        </div>
    );
};