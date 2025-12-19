import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CinematicWrapper } from "@/components/CinematicWrapper";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Github, Mail } from "lucide-react";

const AuthOptionsPage = () => {
    const navigate = useNavigate();

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5555';

    const handleEmailLogin = () => {
        navigate("/auth/email");
    };

    const handleGitHubLogin = () => {
        window.location.href = `${API_URL}/auth/github`;
    };

    return (
        <CinematicWrapper className="flex items-center justify-center pt-20 p-4">
  
            <Card className="w-full max-w-md border-slate-700/50 bg-slate-900/50 backdrop-blur-md shadow-2xl">
                <CardHeader className="text-center space-y-1">
                    <CardTitle className="text-2xl font-bold tracking-tight text-white">
                        Welcome back
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        Login or Register to access your dashboard
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">

               
                    <Button
                        size="lg"
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-[0_0_15px_rgba(6,182,212,0.4)] border-none transition-all"
                        onClick={handleGitHubLogin}
                    >
                        <Github className="mr-2 h-5 w-5" />
                        Sign in with GitHub
                    </Button>

                    {/* Divider */}
                    <div className="relative my-2">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-700" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-[#0f172a] px-2 text-slate-500">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        size="lg"
                        className="w-full border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white bg-transparent"
                        onClick={handleEmailLogin}
                    >
                        <Mail className="mr-2 h-5 w-5" />
                        Sign in with Email
                    </Button>

                </CardContent>
            </Card>
        </CinematicWrapper>
    );
};

export default AuthOptionsPage;