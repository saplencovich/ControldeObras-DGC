const express = require("express");
const db = require("../db/connection");

const router = express.Router();

router.get("/", (req, res) => {
  db.all("SELECT * FROM master_items ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    res.json(rows);
  });
});

router.get("/:id", (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM master_items WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!row) {
      return res.status(404).json({ error: "Ítem no encontrado" });
    }

    res.json(row);
  });
});

router.post("/", (req, res) => {
  const {
    project,
    tower,
    floor,
    activity,
    start_date,
    end_date,
    planned_qty,
    executed_qty,
    unit,
    crew_name,
    restrictions,
    status,
    release_status,
  } = req.body;

  const sql = `
    INSERT INTO master_items (
      project,
      tower,
      floor,
      activity,
      start_date,
      end_date,
      planned_qty,
      executed_qty,
      unit,
      crew_name,
      restrictions,
      status,
      release_status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [
      project || "",
      tower || "",
      floor || "",
      activity || "",
      start_date || "",
      end_date || "",
      Number(planned_qty || 0),
      Number(executed_qty || 0),
      unit || "",
      crew_name || "",
      restrictions || "",
      status || "pendiente",
      release_status || "",
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      res.status(201).json({
        id: this.lastID,
        project: project || "",
        tower: tower || "",
        floor: floor || "",
        activity: activity || "",
        start_date: start_date || "",
        end_date: end_date || "",
        planned_qty: Number(planned_qty || 0),
        executed_qty: Number(executed_qty || 0),
        unit: unit || "",
        crew_name: crew_name || "",
        restrictions: restrictions || "",
        status: status || "pendiente",
        release_status: release_status || "",
      });
    }
  );
});

router.put("/:id", (req, res) => {
  const { id } = req.params;

  const {
    project,
    tower,
    floor,
    activity,
    start_date,
    end_date,
    planned_qty,
    executed_qty,
    unit,
    crew_name,
    restrictions,
    status,
    release_status,
  } = req.body;

  const sql = `
    UPDATE master_items
    SET
      project = ?,
      tower = ?,
      floor = ?,
      activity = ?,
      start_date = ?,
      end_date = ?,
      planned_qty = ?,
      executed_qty = ?,
      unit = ?,
      crew_name = ?,
      restrictions = ?,
      status = ?,
      release_status = ?
    WHERE id = ?
  `;

  db.run(
    sql,
    [
      project || "",
      tower || "",
      floor || "",
      activity || "",
      start_date || "",
      end_date || "",
      Number(planned_qty || 0),
      Number(executed_qty || 0),
      unit || "",
      crew_name || "",
      restrictions || "",
      status || "pendiente",
      release_status || "",
      id,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        id: Number(id),
        project: project || "",
        tower: tower || "",
        floor: floor || "",
        activity: activity || "",
        start_date: start_date || "",
        end_date: end_date || "",
        planned_qty: Number(planned_qty || 0),
        executed_qty: Number(executed_qty || 0),
        unit: unit || "",
        crew_name: crew_name || "",
        restrictions: restrictions || "",
        status: status || "pendiente",
        release_status: release_status || "",
      });
    }
  );
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;

  db.serialize(() => {
    db.run("DELETE FROM daily_logs WHERE master_item_id = ?", [id]);

    db.run("DELETE FROM master_items WHERE id = ?", [id], function (err) {
      if (err) return res.status(500).json({ error: err.message });

      res.json({ message: "Ítem eliminado correctamente" });
    });
  });
});

module.exports = router;