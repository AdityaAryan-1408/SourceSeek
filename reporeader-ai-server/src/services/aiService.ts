import { HfInference } from "@huggingface/inference";
import prisma from "../lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

const EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const HF_GENERATION_MODEL = "HuggingFaceH4/zephyr-7b-beta";
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/* =========================
   1. EMBEDDINGS
========================= */

export const generateEmbedding = async (text: string): Promise<number[]> => {
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const output = await hf.featureExtraction({
                model: EMBEDDING_MODEL,
                inputs: text,
            });

            if (Array.isArray(output)) {
                if (Array.isArray(output[0])) return output[0] as number[];
                return output as number[];
            }

            throw new Error("Invalid embedding output format");

        } catch (error: any) {
            const status = error?.response?.status;

            if (status === 503 || error.message?.includes("loading")) {
                console.warn(
                    `[AI Service] Embedding model loading (attempt ${attempt}/${maxRetries})`
                );
                await sleep(5000);
                continue;
            }

            console.error("[AI Service] Embedding generation failed:", error);
            throw error;
        }
    }

    throw new Error("Embedding model unavailable after retries");
};

/* =========================
   2. VECTOR SEARCH
========================= */

export const findRelevantChunks = async (question: string, repoId: string) => {
    console.log(`[AI Service] Searching context for repo ${repoId}`);

    const questionVector = await generateEmbedding(question);

    const result = await prisma.$queryRaw`
        SELECT 
            "CodeChunk"."content",
            "CodeChunk"."startLine",
            "CodeChunk"."endLine",
            "RepoFile"."filePath",
            1 - ("CodeChunk"."vector" <=> ${JSON.stringify(questionVector)}::vector) AS similarity
        FROM "CodeChunk"
        JOIN "RepoFile" ON "CodeChunk"."fileId" = "RepoFile"."id"
        WHERE "RepoFile"."repoId" = ${repoId}
        ORDER BY similarity DESC
        LIMIT 5;
    `;

    return result as any[];
};

/* =========================
   3. GENERATION PROVIDERS
========================= */

const generateWithGemini = async (prompt: string): Promise<string> => {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    for (let attempt = 1; attempt <= GEMINI_MAX_RETRIES; attempt++) {
        try {
            const result = await model.generateContent(prompt);
            return result.response.text();

        } catch (error: any) {
            const status = error?.status || error?.response?.status;

            if (status === 503 || status === 429) {
                const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
                console.warn(
                    `[AI Service] Gemini overloaded (attempt ${attempt}/${GEMINI_MAX_RETRIES}), retrying in ${delay}ms`
                );
                await sleep(delay);
                continue;
            }

            throw error;
        }
    }

    throw new Error("Gemini unavailable after retries");
};

const generateWithHuggingFace = async (prompt: string): Promise<string> => {
    const response = await hf.textGeneration({
        model: HF_GENERATION_MODEL,
        inputs: prompt,
        parameters: {
            max_new_tokens: 512,
            temperature: 0.3,
        },
    });

    return response.generated_text;
};

/* =========================
   4. ANSWER GENERATION (IMPROVED)
========================= */

export const generateAnswer = async (
    question: string,
    repoId: string
): Promise<any> => {

    const contextChunks = await findRelevantChunks(question, repoId);

    if (contextChunks.length === 0) {
        return {
            answer: "I could not find relevant code in this repository.",
            context: null,
        };
    }

    // Pass the index (0-4) to the AI so it can reference it
    const contextString = contextChunks.map((chunk, index) =>
        `[Source ${index}]: File: ${chunk.filePath} (Lines ${chunk.startLine}-${chunk.endLine})
${chunk.content}`
    ).join("\n\n---\n\n");

    const prompt = `
You are an expert software engineer.
Answer the question strictly using the provided code context.

Question:
"${question}"

Context:
${contextString}

Rules:
1. Cite files and functions explicitly in your explanation.
2. If the answer is not present in the context, say "I cannot answer this based on the provided code."
3. CRITICAL: At the very end of your response, on a new line, output strictly the tag "[SOURCE: X]" where X is the index number (0-4) of the single most relevant source code block you used.
   Example:
   The login logic is in Auth.ts...
   
   [SOURCE: 2]
`;

    let fullResponse: string;

    try {
        fullResponse = await generateWithGemini(prompt);
    } catch (geminiError) {
        console.warn("[AI Service] Gemini failed. Falling back to Hugging Face.");
        try {
            fullResponse = await generateWithHuggingFace(prompt);
        } catch (hfError) {
            console.error("[AI Service] All providers failed:", hfError);
            return {
                answer: "The AI service is currently under heavy load. Please try again shortly.",
                targetNode: null,
                highlight: null
            };
        }
    }

    // --- SMART SOURCE PARSING ---
    // 1. Default to the first chunk if parsing fails
    let bestMatchIndex = 0;
    let cleanAnswer = fullResponse;

    // 2. Look for the [SOURCE: X] tag
    const sourceMatch = fullResponse.match(/\[SOURCE:\s*(\d+)\]/i);

    if (sourceMatch && sourceMatch[1]) {
        const index = parseInt(sourceMatch[1], 10);
        if (index >= 0 && index < contextChunks.length) {
            bestMatchIndex = index;
            console.log(`[AI Smart Match] AI selected Source ${index}: ${contextChunks[index].filePath}`);
        }
        // 3. Remove the tag from the message shown to the user
        cleanAnswer = fullResponse.replace(/\[SOURCE:\s*\d+\]/gi, "").trim();
    } else {
        console.log(`[AI Smart Match] No source tag found. Defaulting to Vector Search Rank #1.`);
    }

    const bestMatch = contextChunks[bestMatchIndex];

    return {
        answer: cleanAnswer,
        targetNode: bestMatch.filePath,
        highlight: {
            startLine: bestMatch.startLine,
            endLine: bestMatch.endLine,
        },
    };
};