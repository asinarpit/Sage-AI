import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
    process.env.GOOGLE_GENERATIVE_AI_API_KEY!
);

export const generateEmbedding = async (text: string) => {
    const model = genAI.getGenerativeModel({
        model: "gemini-embedding-001",
    });

    const result = await model.embedContent(text);

    return result.embedding.values;
};