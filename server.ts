
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();

// Standard middleware setup
app.use(cors() as any);
app.use(express.json() as any);

/**
 * Endpoint for streaming chat responses.
 * Designed to be called by frontend if client-side SDK is restricted.
 */
app.post('/api/chat/stream', (async (req: any, res: any) => {
  const { messages, systemInstruction } = req.body;

  if (!import.meta.env.VITE_API_KEY) {
    return res.status(500).json({ error: "API Key missing in environment variables" });
  }

  // SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

  try {
    const isComplex = systemInstruction?.toLowerCase().includes('code') || 
                      systemInstruction?.toLowerCase().includes('architect');
    
    // Model selection based on requirements
    const model = isComplex ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

    const history = messages.slice(-11, -1).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));
    
    const userMessage = messages[messages.length - 1].content;

    const streamResponse = await ai.models.generateContentStream({
      model,
      contents: [...history, { role: 'user', parts: [{ text: userMessage }] }],
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    for await (const chunk of streamResponse) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }
  } catch (error: any) {
    console.error("Server Stream Error:", error);
    res.write(`data: ${JSON.stringify({ error: "Generation interrupted" })}\n\n`);
  } finally {
    res.write('data: [DONE]\n\n');
    res.end();
  }
}) as any);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`NovaAI Backend active on port ${PORT}`));
