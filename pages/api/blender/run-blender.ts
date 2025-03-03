import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import { exec } from "child_process";
import path from "path";
import os from "os";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ message: `Méthode ${req.method} non autorisée` });
  }

  const { scriptOnly } = req.body;
  if (!scriptOnly) {
    console.error("❌ Aucune donnée reçue");
    return res.status(400).json({ message: "Aucun script fourni" });
  }

  // Définition des chemins
  const tempDir = os.tmpdir();
  const scriptPath = path.join(tempDir, "generated_script.py");
  const renderPath = path.join(tempDir, "render.png");

  // Code pour ajouter une caméra si elle n'existe pas
  const renderCode = `
import os

# Vérifier si une caméra existe
if not any(obj.type == 'CAMERA' for obj in bpy.data.objects):
    print("📸 Aucune caméra détectée, ajout d'une caméra...")
    cam = bpy.data.objects.new(name="Camera", object_data=bpy.data.cameras.new(name="Camera"))
    bpy.context.collection.objects.link(cam)
    cam.location = (0.04, -7.2, 3.5)
    cam.rotation_euler = (1.1, 0, 0)  # L'orienter vers l'objet

    # Définir cette caméra comme active
    bpy.context.scene.camera = cam

# Définir le chemin du rendu
output_path = r"${renderPath}"

# Configurer le moteur de rendu (Cycles pour une meilleure qualité)
bpy.context.scene.render.engine = 'CYCLES'
bpy.context.scene.render.filepath = output_path
bpy.context.scene.render.image_settings.file_format = 'PNG'

# Effectuer le rendu
bpy.ops.render.render(write_still=True)
`;

const updatedScript = `
import bpy
import bmesh

# Vérifier si l'objet est en mode édition
obj = bpy.context.object

# Passer en mode édition si nécessaire
if obj.mode != 'EDIT':
    bpy.ops.object.mode_set(mode='EDIT')

# Assurer que la table des indices des sommets soit mise à jour
bm = bmesh.from_edit_mesh(obj.data)
bm.verts.ensure_lookup_table()  # Important pour mettre à jour les indices des sommets

# Revenir en mode objet après la modification
bpy.ops.object.mode_set(mode='OBJECT')

# Ajouter le script utilisateur ici
${scriptOnly}
`;

  // Fusionner le script reçu avec le code de rendu
/*   const finalScript = scriptOnly + "\n" + renderCode; */
const finalScript = updatedScript + "\n" + renderCode;

  try {
    console.log(`📝 Sauvegarde du script dans ${scriptPath}`);
    fs.writeFileSync(scriptPath, finalScript, "utf-8");

    console.log(`🚀 Exécution de Blender avec le script : ${scriptPath}`);
    const blenderCmd = `blender --background --python "${scriptPath}"`;

    exec(blenderCmd, (error, stdout, stderr) => {
      console.log("📜 Blender stdout :", stdout);
      console.error("⚠️ Blender stderr :", stderr);

      if (error) {
        console.error("❌ Erreur d'exécution de Blender :", error);
        return res.status(500).json({ message: `Erreur : ${stderr || error.message}` });
      }

      // Vérifier si l’image a bien été générée
      if (!fs.existsSync(renderPath)) {
        console.error("❌ Image de rendu non trouvée !");
        return res.status(500).json({ message: "Le rendu n'a pas été généré." });
      }

      console.log(`✅ Rendu terminé, envoi de l'image : ${renderPath}`);

      // Lire et envoyer l’image en réponse
      const imageBuffer = fs.readFileSync(renderPath);
      res.setHeader("Content-Type", "image/png");
      res.send(imageBuffer);
    });
  } catch (err) {
    console.error("❌ Erreur lors du processus :", err);
    return res.status(500).json({ message: `Erreur : ${err.message}` });
  }
}
