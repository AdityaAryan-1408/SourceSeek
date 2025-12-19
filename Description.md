
# RepoReader AI: Project Context & Implementation Plan

## 1\. Project Overview

**RepoReader AI** is a full-stack web application that allows users to "chat with" any public or private GitHub repository. A user provides a GitHub link, and the system ingests, parses, and indexes the entire codebase.

The user can then ask natural-language questions (e.g., "How is sign-up handled?", "Explain the `useAnalytics` hook") and receive context-aware answers. The system uses a **Retrieval-Augmented Generation (RAG)** pipeline, leveraging the **Gemini API** to provide answers based *only* on the repository's source code.

The user interface is a dynamic, graph-based explorer. When a user asks a question, the application automatically pans and zooms to the relevant file in a repository "mind-map," expands its parent folders, and highlights the specific function or code block that answers the question.

The application supports both email/password and GitHub OAuth authentication, allowing users to save their repository history for future sessions.

## 2\. Core Features

  * **Animated Intro Page:** Engaging, modern landing page with animated text and background effects.
  * **Dual Authentication:** Sign in with email/password or with a GitHub account.
  * **Personal Dashboard:** Save repository links to a personal dashboard for quick access or deletion.
  * **Graph-Based Navigation:** View any repository as a dynamic, zoomable `react-flow` graph instead of a static file tree.
  * **Chat-to-Focus:** A chat interface that drives the graph. Asking a question automatically animates the graph to focus on the relevant file.
  * **Smart Highlighting:** The system doesn't just find the file; it highlights the *exact* function or code block (in the code viewer) that answers the user's question.
  * **Auto-Expand:** The graph automatically expands parent folders to reveal the focused file, showing its exact location in the hierarchy.

-----

## 3\. Technology Stack

  * **Frontend:** `Vite` + `React` (with `TypeScript`), `Tailwind CSS`
  * **UI Components:** `shadcn/ui`, `react-router-dom`
  * **Graph/Canvas:** `react-flow`
  * **State Management:** `zustand`
  * **Code Rendering:** `react-syntax-highlighter`
  * **Animations:** `Framer Motion` (or similar), `Particles.js` (or similar)
  * **Backend:** `Node.js` + `Express` (with `TypeScript`)
  * **Primary Database:** `PostgreSQL` (with `Prisma` as the ORM)
  * **Vector Database:** `pgvector`
  * **GenAI Provider:** `Google Gemini API` (`text-embedding-004`, `gemini-2.5-flash-preview`)
  * **Key Backend Libraries:** `simple-git` (for cloning), `bcrypt` (auth), `jsonwebtoken` (auth), `Passport.js` (for GitHub OAuth)

-----

## 4\. Deployment Strategy (Best-in-Class)

This project requires a decoupled deployment, as the frontend and backend have different hosting needs.

  * **Frontend (React App):**

      * **Platform:** **Vercel**
      * **Why:** Vercel provides the best-in-class global CDN and CI/CD pipeline for React/Vite applications, ensuring the fastest possible frontend performance.

  * **Databases (PostgreSQL + pgvector):**

      * **Platform:** **Supabase**
      * **Why:** Supabase is a full-service platform built on PostgreSQL. It includes the **pgvector** extension, which can be enabled with a single click, making it the perfect all-in-one solution for both our primary database and our vector database.

  * **Backend (Node.js API):**

      * **Platform:** **Render** (or **Railway**)
      * **Why (This is the most critical part):** Our backend is **stateful**. It uses `simple-git` to clone repositories, which requires a **writable file system**.
      * "Serverless" platforms (like Vercel Functions) cannot be used as they have a read-only file system.
      * **Render** provides a "Web Service" (a stateful container) that has a file system, allowing `simple-git` to clone repositories into a temporary directory for processing.

-----

## 5\. Phased Implementation Plan

The project is divided into five phases. **Phase 1** focuses on building the *entire* frontend user experience using a mock (fake) backend. Subsequent phases focus on building the real backend and replacing the mock data.

### Phase 1: Frontend-First Prototyping (Mock Backend)

**Goal:** Build the complete, interactive frontend application. All backend calls will be faked to perfect the user experience before any backend code is written.

  * **Step 1.1: Project Setup**

      * **Task:** Initialize the React project and install core dependencies.
      * **Tech Stack:** `Vite`, `React`, `TypeScript`, `Tailwind CSS`.
      * **Action:**
          * Run `npm create vite@latest reporeader-ai-client -- --template react-ts`.
          * Install and configure Tailwind CSS.

  * **Step 1.2: UI Components & Routing**

      * **Task:** Set up the component library and application routes and a shared layout.
      * **Tech Stack:** `shadcn/ui`, `react-router-dom`.
      * **Action:**
          * Run `npx shadcn-ui@latest init` to set up the component system.
          * Install `react-router-dom`.
          * Create a `Navbar` component (sticky, with backdrop blur) that will be shared across the app.
          * Create a `RootLayout` component that renders the `Navbar` and an `Outlet`
          * Nest all application routes (/, /auth, /dashboard, etc.) as children of the `RootLayout` in App.tsx.

  * **Step 1.3: Global "Brain" (State Store)**

      * **Task:** Create a central Zustand store to manage all application state.
      * **Tech Stack:** `zustand`.
      * **Action:**
          * Create `src/store/useAppStore.ts`.
          * Define the store's state: `currentUser` (object or null), `savedRepos` (array), `chatHistory` (array), `selectedNodeId` (string or null), `currentHighlight` (object or null), `reactFlowInstance` (object or null).
          * Define **mock actions**: `mockLogin`, `mockLogout`, `addRepo`, `deleteRepo`, `addMessage`.

  * **Step 1.4: Mock Data Creation**

      * **Task:** Create all the fake data the app will consume.
      * **Tech Stack:** `TypeScript`.
      * **Action:**
          * **`src/data/mockGraph.ts`:** Create mock nodes and edges for `react-flow`. Define 3 node types: `rootNode` (repo name), `folderNode` (with `data.isExpandable = true`), and `fileNode`.
          * **`src/data/mockFileContent.ts`:** Create a `Map` that links a `nodeId` (e.g., 'file-Button-tsx') to a string of its fake code.
          * **`src/data/mockAi.ts`:** Create a `getMockAiResponse(prompt)` function. This is the most critical mock. It must return a full object:
            ```json
            {
              "answer": "Sign up is handled by the `signUp` function...",
              "targetNode": "node-id-auth-ts",
              "ancestorsToExpand": ["node-id-src", "node-id-auth"],
              "highlight": { "startLine": 10, "endLine": 25 }
            }
            ```

  * **Step 1.5: Scrollable Landing Page (Updated / route)**

      * **Task:** Develop a modern, multi-section, scrollable landing page to showcase the app's features.
      * **Tech Stack:** `Framer Motion` (for text animations), `Particles.js` (for background effects), `shadcn/ui` (Button).
      * **Action:**
          * Create a `HeroSection` (full-screen) that contains the react-tsparticles background and the alternating text animation.   * Configure react-tsparticles to be fixed, z-0, and have warp: true to act as a seamless, continuous "wallpaper" for the entire page.
          * Implement a responsive, full-screen layout.
          * Add a particle background effect (e.g., using `react-tsparticles`).
          * Create a reusable `FeatureSection` component.   
          * Use Framer Motion's whileInView prop to animate FeatureSections with a fade-in and slide-up effect as the user scrolls.   
          * Add video placeholders (e.g., a shadcn/ui Card) to the feature sections.
          * Implement an alternating text animation (e.g., using `Framer Motion` and an array of phrases like "Chatting with your code", "Understanding complex logic", "Speeding up onboarding", "Reviewing pull requests").
          * Place a large "Get Started" button prominently in the center. On click, this button navigates to the `/auth` route.
          * Create a multi-column `Footer` component with navigation and social links.   * Assemble the IntroPage.tsx by stacking the HeroSection, multiple FeatureSections, a 'Call to Action' block, and the Footer in a relative z-10 container.
          


  * **Step 1.6: Authentication Options Page (New `/auth` route)**

      * **Task:** Create a page that presents sign-in/register options.
      * **Tech Stack:** `shadcn/ui` (Button, Card), `react-router-dom`.
      * **Action:**
          * Create `AuthOptionsPage.tsx` for the `/auth` route.
          * Display two prominent buttons: "Sign in with Email" and "Sign in with GitHub".
          * "Sign in with Email" navigates to a new `/auth/email` route (which will be our `LoginPage.tsx`).
          * "Sign in with GitHub" (for now) will call `useAppStore.mockLogin()` directly and navigate to `/dashboard`. This will be replaced by OAuth in Phase 5.

  * **Step 1.7: Email/Password Login & Registration Page (Updated `/auth/email` route)**

      * **Task:** Update the login page to be specifically for email/password.
      * **Tech Stack:** `react-router-dom`, `zustand`, `shadcn/ui` (Card, Input, Button).
      * **Action:**
          * Rename the previous `LoginPage.tsx` to `EmailAuthPage.tsx` (for `/auth/email`).
          * It will have tabs/toggle for "Login" and "Register" forms.
          * The "Login" button calls `useAppStore.mockLogin()` and navigates to `/dashboard`.
          * The "Register" button (mocked) would also just call `useAppStore.mockLogin()` for now and navigate to `/dashboard`.

  * **Step 1.8: Dashboard Page (Updated `/dashboard` route)**

      * **Task:** Refine the dashboard layout.
      * **Tech Stack:** `react-router-dom`, `zustand`, `shadcn/ui` (Card, Input, Button, List).
      * **Action:**
          * Ensure `DashboardPage.tsx` redirects to `/` if `currentUser` is `null`.
          * **Layout:** The top section should contain the input field to paste a repo link (e.g., in a `shadcn/ui` **Card** or directly at the top). Below this, the "Your Repositories" list should be displayed.
          * The "Analyze" button next to the input calls `useAppStore.addRepo()` and navigates to `/repo/mock`.
          * The "Your Repositories" list renders `savedRepos` from the store, each with "View" and "Delete" buttons as planned.

  * **Step 1.9: Main App Layout**

      * **Task:** Create the 3-panel resizable layout.
      * **Tech Stack:** `shadcn/ui` (Resizable).
      * **Action:**
          * Create `RepoPage.tsx` for the `/repo/:id` route.
          * Use `<ResizablePanelGroup>` to create three panels: Chat (Left), Graph (Center), Code (Right).

  * **Step 1.10: Graph Panel**

      * **Task:** Implement the dynamic, interactive graph.
      * **Tech Stack:** `react-flow`.
      * **Action:**
          * Create `RepoGraph.tsx`.
          * Load `mockNodes` and `mockEdges` from `mockGraph.ts`.
          * Render the `<ReactFlow>` component with `<Background>` and `<Controls>`.
          * Add `onNodeClick` handler to call `useAppStore.setSelectedNodeId(node.id)`.
          * Add `onInit` handler to save the `reactFlowInstance` to the Zustand store.
          * Create custom node components (`<FolderNode>`, `<FileNode>`) that check for `data.isExpandable` to show/hide an arrow indicator.

  * **Step 1.11: Code Viewer Panel**

      * **Task:** Implement the code viewer that can highlight specific lines.
      * **Tech Stack:** `react-syntax-highlighter`, `zustand`.
      * **Action:**
          * Create `CodeViewer.tsx`.
          * It subscribes to `selectedNodeId` from the store. On change, it gets the code string from `mockFileContent` and displays it.
          * It *also* subscribes to `currentHighlight`. If it's not `null`, it passes the `lineProps` to `react-syntax-highlighter` to apply a highlight style to the specified lines.

  * **Step 1.12: Chat Panel & The "Full Loop"**

      * **Task:** Implement the chat UI that controls the other panels.
      * **Tech Stack:** `zustand`, `shadcn/ui` (ScrollArea, Input, Button).
      * **Action:**
          * Create `ChatPanel.tsx`. It renders `chatHistory` from the store.
          * The "Send" button's `onClick` handler will:
            1.  Add the user's message to `chatHistory`.
            2.  Call `const aiResponse = getMockAiResponse(prompt)`.
            3.  Add `aiResponse.answer` to `chatHistory`.
            4.  Call `useAppStore.setState({ currentHighlight: aiResponse.highlight })`.
            5.  Get `reactFlowInstance` from the store.
            6.  Programmatically expand nodes (using `aiResponse.ancestorsToExpand`).
            7.  Call `reactFlowInstance.fitView()` on `aiResponse.targetNode` to animate the graph.

-----

### Phase 2: Core Backend - Auth & Database

**Goal:** Build the real server, database, and authentication to replace the mock auth and repo-saving logic.

  * **Step 2.1: Server & Database Setup**

      * **Task:** Initialize the Node.js server and connect to a primary database.
      * **Tech Stack:** `Node.js`, `Express`, `TypeScript`, `PostgreSQL`, `Prisma`, `Supabase` (for hosting DB).
      * **Action:**
          * Set up an Express server.
          * Set up a new project on **Supabase** to get a PostgreSQL connection string.
          * Run `npx prisma init` and connect to the Supabase database.

  * **Step 2.2: Database Schema**

      * **Task:** Define the data models for users and their saved repos.
      * **Tech Stack:** `Prisma Schema Language`.
      * **Action:**
          * Define a `User` model (with fields for email, passwordHash, and an optional `githubId`).
          * Define an `Account` model (for OAuth linking).
          * Define a `Repository` model (with `url`, `name`, and a relation to `userId`).

  * **Step 2.3: Email/Password API**

      * **Task:** Create registration and login endpoints.
      * **Tech Stack:** `Express`, `bcrypt` (for hashing), `jsonwebtoken` (JWT).
      * **Action:**
          * Create `POST /auth/register` (hashes password with `bcrypt`, saves User, returns JWT).
          * Create `POST /auth/login` (compares hash, returns JWT).
          * Create an `authMiddleware` to protect routes using the JWT.

  * **Step 2.4: Repository CRUD API**

      * **Task:** Create endpoints for managing a user's saved repositories.
      * **Tech Stack:** `Express`, `Prisma`, `authMiddleware`.
      * **Action:**
          * Create `GET /api/repos`: (Protected) Gets all repos for the logged-in user.
          * Create `POST /api/repos`: (Protected) Takes a URL, saves it to the DB linked to the user.
          * Create `DELETE /api/repos/:id`: (Protected) Deletes a repo by its ID.

-----

### Phase 3: Backend RAG Pipeline - Ingestion

**Goal:** Build the complex ingestion service that clones, analyzes, and indexes a repository.

  * **Step 3.1: Ingestion Endpoint & Cloning**

      * **Task:** Create an endpoint that receives a repo URL and clones it.
      * **Tech Stack:** `Express`, `simple-git`, `Render` (for hosting).
      * **Action:**
          * Create a protected `POST /api/ingest` endpoint.
          * Use `simple-git` to securely clone the repo into a temporary directory on the server.
          * This step solidifies the need for **Render**, as it requires a writable file system.

  * **Step 3.2: File Parsing & Graph Generation**

      * **Task:** Walk the cloned repo and generate the graph data for the frontend.
      * **Tech Stack:** `Node.js fs` module.
      * **Action:**
          * Write a recursive file-walking service.
          * As it walks, build a JSON object of `nodes` (files/folders) and `edges` (hierarchy) that matches the `react-flow` structure.

  * **Step 3.3: Code Parsing & Chunking**

      * **Task:** Split code files into small, logical chunks for embedding. This is critical for the "function-level highlighting" feature.
      * **Tech Stack:** `AST parsers` (e.g., `tree-sitter`, `@babel/parser`).
      * **Action:**
          * For each relevant file (e.g., `.ts`, `.py`), use an AST parser to split it by `function` or `class`.
          * For each chunk, store its text and metadata: `{ fileId, chunkText, startLine, endLine }`.

  * **Step 3.4: Vector Embedding & Storage**

      * **Task:** Convert code chunks into vectors and store them.
      * **Tech Stack:** `@google/generative-ai` (Gemini API), `Supabase` (with `pgvector`).
      * **Action:**
          * Enable the `pgvector` extension in your **Supabase** project dashboard.
          * For each chunk, send its `chunkText` to the Gemini `text-embedding-004` model to get a vector.
          * Store the vector in the DB along with its metadata (`repoId`, `fileId`, `startLine`, `endLine`).

  * **Step 3.5: Save Graph Data**

      * **Task:** Save the file graph data to the primary database.
      * **Tech Stack:** `PostgreSQL`, `Prisma`.
      * **Action:**
          * Store the JSON graph data (from Step 3.2) in your **Supabase** PostgreSQL DB, linked to the `Repository`. This allows for fast retrieval without re-cloning.

-----

### Phase 4: Backend RAG Pipeline - Querying

**Goal:** Build the chat endpoint that uses the RAG pipeline to answer user questions.

  * **Step 4.1: Chat Endpoint & Prompt Embedding**

      * **Task:** Create the chat API and convert the user's question into a vector.
      * **Tech Stack:** `Express`, `@google/generative-ai`.
      * **Action:**
          * Create protected `POST /api/chat` endpoint (takes `repoId` and `prompt`).
          * Send the `prompt` to the `text-embedding-004` model to get a query vector.

  * **Step 4.2: Vector Search & Context Retrieval**

      * **Task:** Find the most relevant code chunks from the vector DB.
      * **Tech Stack:** `Supabase Client` (for `pgvector`).
      * **Action:**
          * Perform a similarity search in your **Supabase** vector DB (scoped to the `repoId`) using the query vector.
          * Retrieve the top 5-10 matching chunks (which include their metadata: `fileId`, `startLine`, `endLine`).

  * **Step 4.3: Generative Response**

      * **Task:** Use Gemini to generate a human-readable answer based on the retrieved context.
      * **Tech Stack:** `@google/generative-ai` (`gemini-2.5-flash-preview` or similar).
      * **Action:**
          * Construct a detailed prompt for Gemini, including the user's `prompt` and the `chunkText` of all retrieved chunks.
          * Receive the plain text answer from the Gemini API.

  * **Step 4.4: Format the "Smart" Response**

      * **Task:** Package the AI answer with the metadata needed for the frontend's "smart" features.
      * **Tech Stack:** `TypeScript`, `Prisma`.
      * **Action:**
          * Take the top-ranked retrieved chunk (e.g., the `signUp` function).
          * Look up its `fileId` to get the `nodeId` (from the saved graph data).
          * Look up its parent nodes to get the `ancestorsToExpand` array.
          * Construct the *exact* JSON object the frontend expects (as defined in Step 1.4) and send it as the API response.

-----

### Phase 5: Full Integration & GitHub OAuth and Other

**Goal:** Replace all remaining mocks in the frontend with real API calls and implement the "Sign in with GitHub" feature.

  * **Step 5.1: Frontend API Service**

      * **Task:** Connect the frontend to the backend auth and repository APIs.
      * **Tech Stack:** `axios` (or `fetch`), `zustand`, `Vercel` (for Environment Variables).
      * **Action:**
          * Create an API client service (e.g., `src/services/api.ts`).
          * Add your backend API URL (from **Render**) as an environment variable in **Vercel**.
          * Replace all `mockLogin`, `addRepo`, `deleteRepo` calls with real `fetch` calls to your Express backend.
          * Store the JWT from login in the Zustand store and attach it to all protected requests.

  * **Step 5.2: Connect Main App to Backend**

      * **Task:** Wire up the 3-panel app to the real RAG backend.
      * **Tech Stack:** `axios`, `react-flow`, `react-syntax-highlighter`.
      * **Action:**
          * **Chat:** Replace `getMockAiResponse()` with a real `fetch` to `POST /api/chat`.
          * **Graph:** On page load, fetch `/api/repos/:id/graph` to get the *real* nodes/edges for `react-flow`.
          * **Code:** When `selectedNodeId` changes, fetch `/api/repos/:id/file?nodeId=...` to get the *real* file content.
          * Since the frontend was built to handle the "smart" response object, this should work seamlessly.

  * **Step 5.3: GitHub OAuth Implementation**

      * **Task:** Add the "Sign in with GitHub" option.
      * **Tech Stack:** `Passport.js` (with `passport-github2`), `Express`, `Prisma`.
      * **Action:**
          * **Backend:** Set up GitHub as an OAuth provider. Create `GET /auth/github` (redirects to GitHub) and `GET /auth/github/callback` (handles the response, finds or creates a user, and returns a JWT).

  * **Account Linking:** In the callback, if a user is already logged in (via JWT), link the new GitHub profile to their *existing* `User` account in Prisma.

  * **Frontend:** Update the "Sign in with GitHub" button on `AuthOptionsPage.tsx` to redirect to `YOUR_BACKEND_URL/auth/github`. Add a "Connect GitHub" button to a new `ProfilePage.tsx` (optional).
  also replace the placeholder videos on frontend with real videos.

-----

### Phase 6: Deployment & Launch

**Goal:** Deploy all parts of the application to their production environments, replacing all development/mock settings with production keys.

  * **Step 6.1: Backend Deployment (Render)**

      * **Task:** Deploy the Node.js/Express API to Render.
      * **Tech Stack:** `Render`, `Node.js`.
      * **Action:**
          * Create a new "Web Service" on Render.
          * Link it to the backend's GitHub repository.
          * Set all production environment variables (e.g., `DATABASE_URL` from Supabase, `GEMINI_API_KEY`, `JWT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`).
          * Ensure the "Build Command" (e.g., `npm install && npx prisma generate && npm run build`) and "Start Command" (e.g., `npm start`) are correct.

  * **Step 6.2: Frontend Deployment (Vercel)**

      * **Task:** Deploy the React/Vite frontend to Vercel.
      * **Tech Stack:** `Vercel`, `React`.
      * **Action:**
          * Create a new project on Vercel and link it to the frontend's GitHub repository.
          * Set the one required production environment variable: `VITE_API_BASE_URL` (pointing to the new Render backend URL, e.g., `https://reporeader-api.onrender.com`).
          * Trigger a production build and set the custom domain.

  * **Step 6.3: Final Configuration & Testing**

      * **Task:** Update all production settings and perform a final end-to-end test.
      * **Tech Stack:** `GitHub`, `Vercel`, `Render`.
      * **Action:**
          * On GitHub, update the OAuth application's "Callback URL" to point to the new Render backend URL (e.g., `https://reporeader-api.onrender.com/auth/github/callback`).
          * On Render, update the backend's CORS settings to *only* allow requests from your Vercel frontend domain.
          * Perform a full, end-to-end test: Register a new email user, log in with GitHub, analyze a repo, and run a chat query.



### Phase 6: other Additions
Future Enhancements (Post-Phase 1)


**0. Replace Placeholders with actual videos**
    Created in step 1.5

**1. Automatic Graph Layout (Dagre)**
    What it is: A task to replace the static, hard-coded node positions in the graph with a dynamic layouting library (like Dagre).
    What it will do: Instead of manually setting x and y coordinates, this feature will automatically calculate the optimal position for every node. It will read the size of each node (based on its text length) and intelligently arrange them in a top-down tree, ensuring that no nodes or edges overlap, regardless of file name length.

**2. Code Viewer Search Bar**
    What it is: A simple search input (Ctrl+F style) to be added inside the Code Viewer panel.
    What it will do: This will allow the user to search for specific text (keywords, function names, etc.) within the currently open file. It will provide a familiar utility for navigating large files quickly, complementing the AI's repository-wide search.

**3. Contextual "Ask AI" Popover**
    What it is: A floating button that appears when a user highlights text within the Code Viewer panel.
    What it will do: When a user selects a block of code, a small "Ask AI" button will appear next to their cursor. Clicking this button will automatically copy the selected code, format it, and paste it into the chat input with a default prompt (e.g., "Explain this code..."). This creates a seamless workflow for asking targeted questions about specific code snippets.


**Important Instructions**
Write full code wherever needed, Explain each step and function you are using as if you are teaching to someone, explain what have you done in a particular step and why you have done it this way, mention file name along with its extentions and folder structure each time a new file is created, Proceed step by step, dont mix things from next step in any previous step. Complete a step, inform me that the step is completed, move onto next step and so on. Dont proceed without me telling to, Whenever there is a need to modify a file, inform me what file needs it and then ask for its latest version by mentioning its name and path. Dont assume anything. There is a Future task in the section. This will be implemented once the app is in working condition, at the end just before or after  deployment. 

**Current Progress:**
Finished Phase 2

**Goal**
Finish Phase 4



├── reporeader-ai-client
│   ├── public
│   │   ├── favicon.png
│   │   ├── icon.png
│   │   ├── icon_dark.png
│   ├── src
│   │   ├── assets
│   │   │   ├── favicon.png
│   │   │   ├── icon.png
│   │   │   ├── icon_dark.png
│   │   ├── components
│   │   │   ├── graph
│   │   │   │   ├── CustomNodes.tsx
│   │   │   ├── landing
│   │   │   │   ├── FeatureSection.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   ├── HeroSection.tsx
│   │   │   │   ├── MagneticButton.tsx
│   │   │   │   ├── ParticleNetwork.tsx
│   │   │   │   ├── ScrambleText.tsx
│   │   │   │   ├── TiltCard.tsx
│   │   │   ├── ui
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── label.tsx
│   │   │   │   ├── resizable.tsx
│   │   │   │   ├── scroll-area.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   ├── AnalysisLoading.tsx
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── CinematicWrapper.tsx
│   │   │   ├── CodeViewer.tsx
│   │   │   ├── Logo.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── ParticleBackground.tsx
│   │   │   ├── RepoGraph.tsx
│   │   ├── config
│   │   │   ├── particlesConfig.ts
│   │   ├── data
│   │   │   ├── mockAi.ts
│   │   │   ├── mockFileContent.ts
│   │   │   ├── mockGraph.ts
│   │   ├── lib
│   │   │   ├── utils.ts
|   |   |   ├── passport.ts
│   │   ├── pages
│   │   │   ├── AuthOptionsPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── EmailAuthPage.tsx
│   │   │   ├── IntroPage.tsx
│   │   │   ├── RepoPage.tsx
│   │   │   ├── RootLayout.tsx
│   │   ├── services
│   │   │   ├── api.ts
│   │   ├── store
│   │   │   ├── useAppStore.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── main.tsx
│   ├── .gitignore
│   ├── components.json
│   ├── eslint.config.js
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.js
│   ├── README.md
│   ├── tailwind.config.js
│   ├── tsconfig.app.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
├── reporeader-ai-server
│   ├── prisma
│   │   ├── schema.prisma
│   ├── src
│   │   ├── controllers
│   │   │   ├── authController.ts
│   │   │   ├── ingestController.ts
│   │   │   ├── qaController.ts
│   │   │   ├── repoController.ts
│   │   ├── lib
│   │   │   ├── prisma.ts
│   │   ├── middleware
│   │   │   ├── authMiddleware.ts
│   │   ├── routes
│   │   │   ├── authRoutes.ts
│   │   │   ├── ingestRoutes.ts
│   │   │   ├── qaRoutes.ts
│   │   │   ├── repoRoutes.ts
│   │   ├── services
│   │   │   ├── aiService.ts
│   │   │   ├── chunkingService.ts
│   │   │   ├── fileService.ts
│   │   │   ├── githubService.ts
│   │   ├── index.ts
│   │   ├── test-auth.ts
│   ├── temp
│   ├── .env
│   ├── .gitignore
│   ├── nodemon.json
│   ├── package-lock.json
│   ├── package.json
│   ├── prisma.config.ts
│   ├── tsconfig.json
├── Description.md