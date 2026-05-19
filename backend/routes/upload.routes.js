const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const uploadsDir = path.join(__dirname, "..", "uploads");
const signaturesDir = path.join(uploadsDir, "signatures");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(signaturesDir)) {
  fs.mkdirSync(signaturesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${ext}`;

    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error("Solo se permiten imágenes JPG, PNG o WEBP"), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

// Subida normal de fotos
router.post("/", (req, res) => {
  upload.single("photo")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            error: "La imagen no puede pesar más de 5 MB",
          });
        }

        return res.status(400).json({
          error: err.message,
        });
      }

      return res.status(400).json({
        error: err.message || "Error subiendo imagen",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "No se recibió ninguna imagen",
      });
    }

    return res.status(201).json({
      filename: req.file.filename,
      original_name: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      file_url: `/uploads/${req.file.filename}`,
    });
  });
});

// Subida de firma en base64 como PNG transparente
router.post("/signature", (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return res.status(400).json({
        error: "No se recibió la firma.",
      });
    }

    if (!imageBase64.startsWith("data:image/png;base64,")) {
      return res.status(400).json({
        error: "La firma debe venir en formato PNG base64.",
      });
    }

    const base64Data = imageBase64.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    if (!buffer.length) {
      return res.status(400).json({
        error: "La firma está vacía.",
      });
    }

    if (buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({
        error: "La firma no puede pesar más de 2 MB.",
      });
    }

    const fileName = `firma-${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}.png`;

    const filePath = path.join(signaturesDir, fileName);

    fs.writeFile(filePath, buffer, (err) => {
      if (err) {
        console.error("Error guardando firma:", err);

        return res.status(500).json({
          error: "No se pudo guardar la firma.",
        });
      }

      return res.status(201).json({
        filename: fileName,
        original_name: fileName,
        mimetype: "image/png",
        size: buffer.length,
        file_url: `/uploads/signatures/${fileName}`,
      });
    });
  } catch (error) {
    console.error("Error procesando firma:", error);

    return res.status(500).json({
      error: "Error procesando firma.",
    });
  }
});

// Eliminar foto normal
router.delete("/:filename", (req, res) => {
  const { filename } = req.params;

  const safeName = path.basename(filename);
  const filePath = path.join(uploadsDir, safeName);

  fs.unlink(filePath, (err) => {
    if (err && err.code !== "ENOENT") {
      return res.status(500).json({
        error: "No se pudo eliminar el archivo",
      });
    }

    return res.json({
      message: "Archivo eliminado",
      filename: safeName,
    });
  });
});

module.exports = router;