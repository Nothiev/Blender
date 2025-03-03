"use client";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"


export default function Home() {
  const [description, setDescription] = useState("");
  const [script, setScript] = useState("");
  const [scriptOnly, setScriptOnly] = useState("");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageDescription, setImageDescription] = useState<string>("");
  const [shouldRegenerate, setShouldRegenerate] = useState<boolean>(false);

  const compareDescriptions = async (userDescription: string, imageDesc: string) => {
    const response = await fetch("/api/description-rendu/compare-description", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userDescription, imageDesc })
    });

    const data = await response.json();
    return data.similarity;
  };

  const generateScript = async () => {
    const response = await fetch("/api/generated-script/codestral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });

    const data = await response.json();
    const match = data.script.match(/```python\n([\s\S]*?)\n```/);
    const extractedScript = match ? match[1] : "Erreur lors de la génération";

    setScriptOnly(extractedScript);
    setScript(data.script || "Erreur lors de la génération");
  };

  const encodeImageToBase64 = (blob: Blob) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          resolve(reader.result as string);  // image en base64
        } else {
          reject(new Error("Erreur de conversion en base64"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const sendImageToPixtral = async (base64Image: string) => {
    const response = await fetch("/api/description-rendu/pixtral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: base64Image
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("Description Pixtral :", data.description);
      setImageDescription(data.description || "Aucune description reçue.");
    } else {
      setImageDescription("Erreur lors de l'obtention de la description.");
    }
  };

  const executeBlenderScript = async () => {
    if (!scriptOnly) return;

    const response = await fetch("/api/blender/run-blender", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scriptOnly }),
    });

    if (!response.ok) {
      console.error("Erreur lors de l'exécution de Blender");
      return;
    }

    // Lire l'image en tant que blob et la convertir en URL pour affichage
    const blob = await response.blob();
    const imageUrl = URL.createObjectURL(blob);
    setImageSrc(imageUrl);
    const base64Image = await encodeImageToBase64(blob);

    // Envoie l'image à Pixtral pour obtenir la description
    await sendImageToPixtral(base64Image);
  };

  useEffect(() => {
    if (script) {
      executeBlenderScript();
    }
  }, [script]);

  useEffect(() => {
    if (imageDescription) {
      compareDescriptions(description, imageDescription).then((similarity) => {
        console.log("Similarité entre la demande et le rendu:", similarity);

        if (similarity < 0.7) {
          setShouldRegenerate(true);
        }
      });
    }
  }, [imageDescription]);

  // Demande à l'utilisateur s'il veut régénérer le script
  const handleRegenerate = () => {
    if (shouldRegenerate) {
      if (window.confirm("Les descriptions sont trop différentes, voulez-vous régénérer le script ?")) {
        generateScript();
        setShouldRegenerate(false);
      }
    }
  };

  return (
    <div className="flex min-h-screen p-4 space-x-4">
      {/* Formulaire à gauche dans une Card */}
      <div className="w-full md:w-1/3 p-4 flex-col">
        <Card>
          <CardHeader>
            <CardTitle>ShapeCraft</CardTitle>
            <CardDescription>Décris ton objet pour générer un modèle 3D.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              className="w-full p-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décris ton objet 3D..."
            />
            <Button
              onClick={generateScript}
              className="mt-4 cursor-pointer"
            >
              Générer
            </Button>
          </CardContent>
        </Card>
        {imageSrc && <img src={imageSrc} alt="Rendu 3D" className="mt-4 rounded-lg shadow-lg" />}
      </div>

      {/* Réponse à droite */}
      <div className="w-full md:w-2/3 p-4 bg-gray-900 text-white rounded-lg">
        {script && (
          <ReactMarkdown
            components={{
              code({ node, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                return match ? (
                  <pre
                    className={`language-${match[1]} bg-gray-800 p-4 rounded`}
                    {...(props as React.HTMLProps<HTMLPreElement>)}
                  >
                    <code>{String(children).replace(/\n$/, "")}</code>
                  </pre>
                ) : (
                  <code className="bg-gray-800 p-1 rounded" {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {script}
          </ReactMarkdown>
        )}
        {shouldRegenerate && (
          <Button onClick={handleRegenerate} className="mt-4">
            Régénérer le script
          </Button>
        )}
      </div>
    </div>
  );
}
