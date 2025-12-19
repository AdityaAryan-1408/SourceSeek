import { createBrowserRouter, RouterProvider } from "react-router-dom";
import RootLayout from "./pages/RootLayout"; // Import the new layout
import IntroPage from "./pages/IntroPage";
import AuthOptionsPage from "./pages/AuthOptionsPage";
import EmailAuthPage from "./pages/EmailAuthPage";
import DashboardPage from "./pages/DashboardPage";
import RepoPage from "./pages/RepoPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";

const router = createBrowserRouter([
  {
    // This is the new Root Layout route
    path: "/",
    element: <RootLayout />,
    children: [
      // These are the children. They will render inside the <Outlet />
      {
        path: "/",
        element: <IntroPage />,
      },
      {
        path: "/auth",
        element: <AuthOptionsPage />,
      },
      {
        path: "/auth/email",
        element: <EmailAuthPage />,
      },
      {
        path: "/auth/callback",
        element: <AuthCallbackPage />,
      },
      {
        path: "/dashboard",
        element: <DashboardPage />,
      },
      {
        path: "/repo/:repoId",
        element: <RepoPage />,
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;