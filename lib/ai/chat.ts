import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY!
);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

export const generateChatResponse = async (prompt: string) => {
  const result = await model.generateContent(prompt);
  return result.response.text();
};

export const streamChatResponse = async (prompt: string) => {
  const result = await model.generateContentStream(prompt);
  return result.stream;
};