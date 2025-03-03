import { NextResponse } from "next/server";

export const runtime = "edge";

export default async function POST(req: Request) {
    try {
        const { description } = await req.json();

        const response = await fetch("https://codestral.mistral.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
            },
            body: JSON.stringify({
                model: "codestral-latest",
                messages: [
                    { role: "user", content: `Génère un script Python Blender pour : ${description}` },
                ],
            }),
        });

        if (!response.ok) {
            throw new Error(`Erreur API: ${response.statusText}`);
        }

        const data = await response.json();
        return NextResponse.json({ script: data.choices[0].message.content });
    } catch (error) {
        console.error("Erreur dans l'API:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Erreur inconnue" },
            { status: 500 }
        );
    }
}
