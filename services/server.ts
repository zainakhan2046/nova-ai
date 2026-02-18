import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

app.post("/api/image", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/stabilityai/sdxl-turbo",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).send(errorText);
    }

    const buffer = await response.arrayBuffer();
    res.set("Content-Type", "image/png");
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Image generation failed" });
  }
});

app.listen(3001, () => {
  console.log("Server running on port 3001");
});
