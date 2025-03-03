import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Méthode non autorisée" });
  }

  const { userDescription, imageDesc } = req.body;

  // Appel à Mistral pour la comparaison
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.PIXTRAL_API_KEY}`,
    },
    body: JSON.stringify({
      model: "mistral-large-2407",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Compare ces deux descriptions. Retourne uniquement un coefficent de similiraté entre 0 et 1." },
            { type: "text", text: `Description utilisateur: ${userDescription}` },
            { type: "text", text: `Description générée: ${imageDesc}` },
          ],
        },
      ],
    }),
  });

  const data = await response.json();
  console.log("Similarity data:", data.choices[0].message.content);
  if (data.choices && data.choices[0] && data.choices[0].message && typeof data.choices[0].message.content === "string") {
    const similarityString = data.choices[0].message.content.trim();
    
    // Extraire le coefficient de similarité en float
    const similarity = parseFloat(similarityString);
    
    if (isNaN(similarity)) {
      return res.status(500).json({ message: "Erreur lors de la récupération du coefficient de similarité." });
    }
  return res.status(200).json({ similarity });
}
}
