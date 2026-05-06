const express = require("express");
const cors = require("cors");

const initDatabase = require("./db/init");

const projectsRoutes = require("./routes/projects.routes");
const masterItemsRoutes = require("./routes/masterItems.routes");
const dailyLogsRoutes = require("./routes/dailyLogs.routes");
const supportRoutes = require("./routes/support.routes");

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

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
app.use("/api", supportRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});