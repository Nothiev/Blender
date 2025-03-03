"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"


export default function Home() {
  const [description, setDescription] = useState("");
  const [script, setScript] = useState("");

  const generateScript = async () => {
    const response = await fetch("/api/generated-script/codestral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });

    const data = await response.json();
    setScript(data.script || "Erreur lors de la génération");
  };

  return (
    <div className="flex min-h-screen p-4 space-x-4">
      {/* Formulaire à gauche dans une Card */}
      <div className="w-full md:w-1/3 p-4">
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
      </div>
    </div>
  );
}
