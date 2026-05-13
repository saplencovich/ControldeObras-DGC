const express = require("express");
const db = require("../db/connection");

const router = express.Router();

router.get("/", (req, res) => {
  const { project } = req.query;
  let sql = "SELECT * FROM project_workers ORDER BY name ASC";
  const params = [];

  if (project) {
    sql = "SELECT * FROM project_workers WHERE project = ? ORDER BY name ASC";
    params.push(project);
  }

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post("/", (req, res) => {
  const { project, name, role, active } = req.body;

  if (!project || !name) {
    return res.status(400).json({ error: "Faltan campos obligatorios: project y name" });
  }

  db.run(
    `INSERT INTO project_workers (project, name, role, active) VALUES (?, ?, ?, ?)`,
    [project, name, role || "", active ? 1 : 0],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({
        id: this.lastID,
        project,
        name,
        role: role || "",
        active: Boolean(active),
      });
    }
  );
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM project_workers WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: "Trabajador no encontrado" });
    res.json({ message: "Trabajador eliminado", deleted_id: Number(id) });
  });
});

module.exports = router;