const express = require("express");
const db = require("../db/connection");

const router = express.Router();

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
    description,
    status,
    start_date,
    end_date,
    supervisor,
    capataz,
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({
      error: "El nombre de la obra es obligatorio",
    });
  }

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
      name.trim(),
      client || "",
      address || "",
      description || "",
      status || "activa",
      start_date || "",
      end_date || "",
      supervisor || "",
      capataz || "",
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      res.status(201).json({
        id: this.lastID,
        name: name.trim(),
        client: client || "",
        address: address || "",
        description: description || "",
        status: status || "activa",
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
    description,
    status,
    start_date,
    end_date,
    supervisor,
    capataz,
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({
      error: "El nombre de la obra es obligatorio",
    });
  }

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
      name.trim(),
      client || "",
      address || "",
      description || "",
      status || "activa",
      start_date || "",
      end_date || "",
      supervisor || "",
      capataz || "",
      id,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        id: Number(id),
        name: name.trim(),
        client: client || "",
        address: address || "",
        description: description || "",
        status: status || "activa",
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

  db.run("DELETE FROM projects WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });

    res.json({ message: "Obra eliminada correctamente" });
  });
});

module.exports = router;