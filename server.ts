import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/gemini/voice-order", async (req, res) => {
    try {
      const { text, availableProducts } = req.body;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Analise o texto a seguir de um pedido feito por voz e converta para JSON.
Texto: "${text}"

Produtos disponíveis no sistema (você deve mapear os nomes falados para os nomes exatos disponíveis aqui, se houver correspondência aproximada. Se não houver correspondência, ignore o item ou retorne-o o mais próximo possível):
${availableProducts.join(", ")}

Instruções:
- Quantidade: retorne sempre como número (ex: "meia dúzia" = 6, "dois" = 2).
- Pagamento: extraia a forma de pagamento (Pix, Dinheiro, Cartão, Débito, Crédito). Se não identificar, retorne null.
- Cliente: extraia o nome do cliente. Se não identificar, retorne "Desconhecido".
- O retorno deve ser ESTRITAMENTE JSON. Nenhum texto adicional.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              cliente: { type: Type.STRING },
              pagamento: { type: Type.STRING },
              itens: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    produto: { type: Type.STRING },
                    quantidade: { type: Type.NUMBER }
                  },
                  required: ["produto", "quantidade"]
                }
              }
            },
            required: ["cliente", "itens"]
          }
        }
      });
      
      const responseText = response.text || "{}";
      const json = JSON.parse(responseText.trim());
      res.json(json);
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Failed to process voice order" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
