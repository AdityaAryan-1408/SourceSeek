// This interface defines the "smart" response our frontend expects
export interface MockAiResponse {
    answer: string
    targetNode: string
    ancestorsToExpand: string[]
    highlight: { startLine: number; endLine: number }
}

// This function simulates the RAG pipeline
export const getMockAiResponse = (prompt: string): MockAiResponse => {
    const lowerCasePrompt = prompt.toLowerCase()

    // --- Mock Response 1: Question about "sign up" ---
    if (lowerCasePrompt.includes('sign up') || lowerCasePrompt.includes('signup')) {
        return {
            answer: "Sign up is handled in `src/auth/index.ts`. It's a simple POST route that takes an email and password from the request body.",
            targetNode: 'auth-index', // The file to focus on
            ancestorsToExpand: ['root', 'src', 'auth'], // The folders to expand
            highlight: { startLine: 5, endLine: 16 }, // The lines to highlight
        }
    }

    // --- Mock Response 2: Question about "button" ---
    if (lowerCasePrompt.includes('button')) {
        return {
            answer: "The `Button` component is defined in `src/components/Button.tsx`. It accepts a `variant` prop to style it as 'primary' or 'secondary'.",
            targetNode: 'button-tsx',
            ancestorsToExpand: ['root', 'src', 'components'],
            highlight: { startLine: 3, endLine: 23 },
        }
    }

    // --- Default Fallback Response ---
    return {
        answer: "Sorry, I couldn't find a specific code block for that. I'm focusing on `package.json` as a default.",
        targetNode: 'pkg-json',
        ancestorsToExpand: ['root'],
        highlight: { startLine: 1, endLine: 14 },
    }
}