const express = require("express");
const db = require("../db/connection");

const router = express.Router();

function normalizeStatus(status) {
  if (!status) return "activa";

  if (status === "activo") return "activa";
  if (status === "inactivo") return "inactiva";

  return status;
}

router.get("/", (req, res) => {
  db.all("SELECT * FROM projects ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    res.json(rows);
  });
});

router.get("/:id", (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM projects WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!row) {
      return res.status(404).json({ error: "Obra no encontrada" });
    }

    res.json(row);
  });
});

router.post("/", (req, res) => {
  const {
    name,
    client,
    address,
    location,
    description,
    status,
    start_date,
    end_date,
    supervisor,
    capataz,
  } = req.body;

  const projectName = name?.trim();

  if (!projectName) {
    return res.status(400).json({
      error: "El nombre de la obra es obligatorio",
    });
  }

  const projectAddress = address || location || "";

  const sql = `
    INSERT INTO projects (
      name,
      client,
      address,
      description,
      status,
      start_date,
      end_date,
      supervisor,
      capataz
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [
      projectName,
      client || "",
      projectAddress,
      description || "",
      normalizeStatus(status),
      start_date || "",
      end_date || "",
      supervisor || "",
      capataz || "",
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      res.status(201).json({
        id: this.lastID,
        name: projectName,
        client: client || "",
        address: projectAddress,
        description: description || "",
        status: normalizeStatus(status),
        start_date: start_date || "",
        end_date: end_date || "",
        supervisor: supervisor || "",
        capataz: capataz || "",
      });
    }
  );
});

router.put("/:id", (req, res) => {
  const { id } = req.params;

  const {
    name,
    client,
    address,
    location,
    description,
    status,
    start_date,
    end_date,
    supervisor,
    capataz,
  } = req.body;

  const projectName = name?.trim();

  if (!projectName) {
    return res.status(400).json({
      error: "El nombre de la obra es obligatorio",
    });
  }

  const projectAddress = address || location || "";

  const sql = `
    UPDATE projects
    SET
      name = ?,
      client = ?,
      address = ?,
      description = ?,
      status = ?,
      start_date = ?,
      end_date = ?,
      supervisor = ?,
      capataz = ?
    WHERE id = ?
  `;

  db.run(
    sql,
    [
      projectName,
      client || "",
      projectAddress,
      description || "",
      normalizeStatus(status),
      start_date || "",
      end_date || "",
      supervisor || "",
      capataz || "",
      id,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      if (this.changes === 0) {
        return res.status(404).json({ error: "Obra no encontrada" });
      }

      res.json({
        id: Number(id),
        name: projectName,
        client: client || "",
        address: projectAddress,
        description: description || "",
        status: normalizeStatus(status),
        start_date: start_date || "",
        end_date: end_date || "",
        supervisor: supervisor || "",
        capataz: capataz || "",
      });
    }
  );
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM projects WHERE id = ?", [id], (err, project) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!project) {
      return res.status(404).json({ error: "Obra no encontrada" });
    }

    db.serialize(() => {
      db.all(
        "SELECT id FROM master_items WHERE project = ?",
        [project.name],
        (err, items) => {
          if (err) return res.status(500).json({ error: err.message });

          const itemIds = items.map((item) => item.id);

          if (itemIds.length > 0) {
            const placeholders = itemIds.map(() => "?").join(",");

            db.run(
              `DELETE FROM daily_logs WHERE master_item_id IN (${placeholders})`,
              itemIds
            );

            db.run(
              `DELETE FROM site_photos WHERE master_item_id IN (${placeholders})`,
              itemIds
            );

            db.run(
              `DELETE FROM master_items WHERE id IN (${placeholders})`,
              itemIds
            );
          }

          db.run("DELETE FROM projects WHERE id = ?", [id], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            res.json({
              message: "Obra eliminada correctamente",
              deleted_project: project.name,
              deleted_items: itemIds.length,
            });
          });
        }
      );
    });
  });
});

module.exports = router;