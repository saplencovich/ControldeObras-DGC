const express = require("express");
const db = require("../db/connection");

const router = express.Router();

function toNumber(value) {
  return Number(value || 0);
}

function stringifyArray(value) {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (!value) return "[]";
  return value;
}

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
    crew_size,
    crew_members,
    restrictions,
    observations,
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
      crew_size,
      crew_members,
      restrictions,
      observations,
      status,
      release_status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    project || "",
    tower || "",
    floor || "",
    activity || "",
    start_date || "",
    end_date || "",
    toNumber(planned_qty),
    toNumber(executed_qty),
    unit || "",
    crew_name || "",
    toNumber(crew_size),
    stringifyArray(crew_members),
    restrictions || "",
    observations || "",
    status || "pendiente",
    release_status || "no_liberado",
  ];

  db.run(sql, values, function (err) {
    if (err) return res.status(500).json({ error: err.message });

    res.status(201).json({
      id: this.lastID,
      project: project || "",
      tower: tower || "",
      floor: floor || "",
      activity: activity || "",
      start_date: start_date || "",
      end_date: end_date || "",
      planned_qty: toNumber(planned_qty),
      executed_qty: toNumber(executed_qty),
      unit: unit || "",
      crew_name: crew_name || "",
      crew_size: toNumber(crew_size),
      crew_members: stringifyArray(crew_members),
      restrictions: restrictions || "",
      observations: observations || "",
      status: status || "pendiente",
      release_status: release_status || "no_liberado",
    });
  });
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
    crew_size,
    crew_members,
    restrictions,
    observations,
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
      crew_size = ?,
      crew_members = ?,
      restrictions = ?,
      observations = ?,
      status = ?,
      release_status = ?
    WHERE id = ?
  `;

  const values = [
    project || "",
    tower || "",
    floor || "",
    activity || "",
    start_date || "",
    end_date || "",
    toNumber(planned_qty),
    toNumber(executed_qty),
    unit || "",
    crew_name || "",
    toNumber(crew_size),
    stringifyArray(crew_members),
    restrictions || "",
    observations || "",
    status || "pendiente",
    release_status || "no_liberado",
    id,
  ];

  db.run(sql, values, function (err) {
    if (err) return res.status(500).json({ error: err.message });

    if (this.changes === 0) {
      return res.status(404).json({ error: "Ítem no encontrado" });
    }

    res.json({
      id: Number(id),
      project: project || "",
      tower: tower || "",
      floor: floor || "",
      activity: activity || "",
      start_date: start_date || "",
      end_date: end_date || "",
      planned_qty: toNumber(planned_qty),
      executed_qty: toNumber(executed_qty),
      unit: unit || "",
      crew_name: crew_name || "",
      crew_size: toNumber(crew_size),
      crew_members: stringifyArray(crew_members),
      restrictions: restrictions || "",
      observations: observations || "",
      status: status || "pendiente",
      release_status: release_status || "no_liberado",
    });
  });
});

router.delete("/:id", (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM master_items WHERE id = ?", [id], (err, item) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!item) {
      return res.status(404).json({ error: "Ítem no encontrado" });
    }

    db.serialize(() => {
      db.run("DELETE FROM site_photos WHERE master_item_id = ?", [id]);
      db.run("DELETE FROM daily_logs WHERE master_item_id = ?", [id]);

      db.run("DELETE FROM master_items WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        res.json({ message: "Ítem eliminado correctamente" });
      });
    });
  });
});

router.get("/:id/daily-logs", (req, res) => {
  const { id } = req.params;

  db.all(
    "SELECT * FROM daily_logs WHERE master_item_id = ? ORDER BY date DESC, id DESC",
    [id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json(rows);
    }
  );
});

router.post("/:id/daily-logs", (req, res) => {
  const { id } = req.params;

  const {
    date,
    executed_today,
    supervisor,
    crew_name,
    crew_workers,
    hours_worked,
    has_restriction,
    restriction_detail,
    observations,
    capataz_name,
    capataz_signature,
    project,
    tower,
    floor,
    activity,
  } = req.body;

  db.get("SELECT * FROM master_items WHERE id = ?", [id], (err, item) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!item) {
      return res.status(404).json({ error: "Ítem no encontrado" });
    }

    const executedToday = toNumber(executed_today);

    const insertSql = `
      INSERT INTO daily_logs (
        master_item_id,
        project,
        tower,
        floor,
        activity,
        date,
        executed_today,
        supervisor,
        crew_name,
        crew_workers,
        hours_worked,
        has_restriction,
        restriction_detail,
        observations,
        capataz_name,
        capataz_signature
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      id,
      project || item.project || "",
      tower || item.tower || "",
      floor || item.floor || "",
      activity || item.activity || "",
      date || "",
      executedToday,
      supervisor || "",
      crew_name || item.crew_name || "",
      stringifyArray(crew_workers),
      toNumber(hours_worked),
      has_restriction ? 1 : 0,
      restriction_detail || "",
      observations || "",
      capataz_name || "",
      capataz_signature || "",
    ];

    db.run(insertSql, values, function (err) {
      if (err) return res.status(500).json({ error: err.message });

      const newExecutedQty = toNumber(item.executed_qty) + executedToday;

      db.run(
        `
          UPDATE master_items
          SET executed_qty = ?
          WHERE id = ?
        `,
        [newExecutedQty, id],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });

          res.status(201).json({
            id: this.lastID,
            master_item_id: Number(id),
            project: project || item.project || "",
            tower: tower || item.tower || "",
            floor: floor || item.floor || "",
            activity: activity || item.activity || "",
            date: date || "",
            executed_today: executedToday,
            supervisor: supervisor || "",
            crew_name: crew_name || item.crew_name || "",
            crew_workers: stringifyArray(crew_workers),
            hours_worked: toNumber(hours_worked),
            has_restriction: has_restriction ? 1 : 0,
            restriction_detail: restriction_detail || "",
            observations: observations || "",
            capataz_name: capataz_name || "",
            capataz_signature: capataz_signature || "",
          });
        }
      );
    });
  });
});

module.exports = router;