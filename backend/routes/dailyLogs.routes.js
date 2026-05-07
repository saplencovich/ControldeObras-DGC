const express = require("express");
const db = require("../db/connection");

const router = express.Router();

function parseDailyLog(row) {
  return {
    ...row,
    crew_workers: row.crew_workers ? JSON.parse(row.crew_workers) : [],
    has_restriction: Boolean(row.has_restriction),
  };
}

router.get("/", (req, res) => {
  db.all("SELECT * FROM daily_logs ORDER BY date DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    res.json(rows.map(parseDailyLog));
  });
});

router.get("/:id", (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM daily_logs WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!row) {
      return res.status(404).json({ error: "Reporte no encontrado" });
    }

    res.json(parseDailyLog(row));
  });
});

router.post("/", (req, res) => {
  const {
    master_item_id,
    date,
    executed_today,
    supervisor,
    crew_workers,
    hours_worked,
    has_restriction,
    observations,
  } = req.body;

  if (!master_item_id) {
    return res.status(400).json({
      error: "Falta master_item_id",
    });
  }

  const sql = `
    INSERT INTO daily_logs (
      master_item_id,
      date,
      executed_today,
      supervisor,
      crew_workers,
      hours_worked,
      has_restriction,
      observations
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [
      Number(master_item_id),
      date || "",
      Number(executed_today || 0),
      supervisor || "",
      JSON.stringify(crew_workers || []),
      Number(hours_worked || 0),
      has_restriction ? 1 : 0,
      observations || "",
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      db.run(
        `
        UPDATE master_items
        SET executed_qty = executed_qty + ?
        WHERE id = ?
        `,
        [Number(executed_today || 0), Number(master_item_id)]
      );

      res.status(201).json({
        id: this.lastID,
        master_item_id: Number(master_item_id),
        date: date || "",
        executed_today: Number(executed_today || 0),
        supervisor: supervisor || "",
        crew_workers: crew_workers || [],
        hours_worked: Number(hours_worked || 0),
        has_restriction: Boolean(has_restriction),
        observations: observations || "",
      });
    }
  );
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM daily_logs WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });

    res.json({ message: "Reporte diario eliminado correctamente" });
  });
});

module.exports = router;