const express = require("express");
const cors = require("cors");
const path = require("path");

const initDatabase = require("./db/init");

const projectsRoutes = require("./routes/projects.routes");
const masterItemsRoutes = require("./routes/masterItems.routes");
const dailyLogsRoutes = require("./routes/dailyLogs.routes");
const sitePhotosRoutes = require("./routes/sitePhotos.routes");
const auditLogsRoutes = require("./routes/auditLogs.routes");
const uploadRoutes = require("./routes/upload.routes");
const projectWorkersRoutes = require("./routes/projectWorkers.routes");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Permite ver archivos guardados en backend/uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

initDatabase();

app.get("/", (req, res) => {
  res.json({
    message: "Backend local funcionando correctamente",
    project: "Control de Obras",
  });
});

app.use("/api/projects", projectsRoutes);
app.use("/api/master-items", masterItemsRoutes);
app.use("/api/daily-logs", dailyLogsRoutes);
app.use("/api/site-photos", sitePhotosRoutes);
app.use("/api/audit-logs", auditLogsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/project-workers", projectWorkersRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    path: req.originalUrl,
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});