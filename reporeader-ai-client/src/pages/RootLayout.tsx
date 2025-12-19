import { Outlet } from "react-router-dom";
import { Navbar } from "@/components/Navbar";

const RootLayout = () => {
    return (
        <div className="text-white min-h-screen">
            <Navbar />
            {/* This is the fix: We make 'main' relative.
        This creates a stacking context, so the z-0 particles
        and z-10 content inside the <Outlet /> will render
        correctly 'under' the z-50 Navbar.
      */}
            <main className="relative">
                <Outlet />
            </main>
        </div>
    );
};

export default RootLayout;