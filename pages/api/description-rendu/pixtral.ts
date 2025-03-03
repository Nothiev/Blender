import { NextApiRequest, NextApiResponse } from "next";

// Désactiver le bodyParser de Next.js
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
  }

  try {
    // Lire le corps brut de la requête
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const rawBody = Buffer.concat(buffers).toString();

    let imageData;
    try {
      const parsedBody = JSON.parse(rawBody);
      imageData = parsedBody.image;
    } catch (err) {
      return res.status(400).json({ message: "Format JSON invalide" });
    }

    if (!imageData) {
      return res.status(400).json({ message: "Aucune image reçue" });
    }

    // Vérifier si l’image est encodée en base64
    if (!imageData.startsWith("data:image")) {
      return res.status(400).json({ message: "L'image doit être en base64 avec un préfixe valide" });
    }

    // Envoi à l'API Pixtral
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.PIXTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: "pixtral-12b",
        messages: [
          { 
            role: "user", 
            content: [
              { type: "text", text: "What's in this image?" },
              { type: "image_url", image_url: imageData }
            ]
          }
        ],
      }),
    });

    const data = await response.json();
    

    if (!response.ok) {
      return res.status(500).json({ message: "Erreur Pixtral", error: data });
    }

    return res.status(200).json({ description: data.choices?.[0]?.message?.content || "Pas de description trouvée" });
  } catch (error) {
    console.error("Erreur API:", error);
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
}
