import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";

const getAI = () => {
  const apiKey = import.meta.env.VITE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing VITE_API_KEY in .env.local");
  }

  return new GoogleGenAI({ apiKey });
};

export const apiService = {
  async chatStream(
    messages: Message[],
    systemInstruction: string,
    onChunk: (text: string) => void,
    signal: AbortSignal
  ): Promise<void> {
    const ai = getAI();
    const modelName = "gemini-2.5-flash";

    const history = messages.slice(-10, -1).map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const userMessage = messages[messages.length - 1].content;

    try {
      const stream = await ai.models.generateContentStream({
        model: modelName,
        contents: [
          ...history,
          { role: "user", parts: [{ text: userMessage }] },
        ],
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      for await (const chunk of stream) {
        if (signal.aborted) break;
        const text = chunk.text;
        if (text) onChunk(text);
      }
    } catch (error: any) {
      if (error?.status === 429) {
        onChunk("⚠️ Rate limit reached. Please wait 60 seconds.");
      } else {
        onChunk("⚠️ Connection error.");
      }
      console.error("Chat Error:", error);
    }
  },
async generateImage(prompt: string): Promise<string> {
  const response = await fetch("http://localhost:3001/api/image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error("Image generation failed");
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}


};
