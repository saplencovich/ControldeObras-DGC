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

function safeParseArray(value) {
  try {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function parseDailyLog(row) {
  return {
    ...row,
    crew_workers: safeParseArray(row.crew_workers),
    has_restriction: Boolean(row.has_restriction),
  };
}

function isBlank(value) {
  return !String(value || "").trim();
}

function validateDailyLogPayload(payload) {
  const requiredFields = [
    [payload.date, "Debe ingresar la fecha del reporte"],
    [payload.supervisor, "Debe seleccionar un supervisor"],
    [payload.crew_name, "Debe ingresar la cuadrilla"],
    [payload.capataz_name, "Debe ingresar el nombre del capataz"],
    [payload.observations, "Debe ingresar observaciones"],
  ];
  const missingField = requiredFields.find(([value]) => isBlank(value));
  if (missingField) return missingField[1];

  if (!payload.executed_today || toNumber(payload.executed_today) <= 0) {
    return "Debe ingresar la cantidad ejecutada hoy";
  }

  if (!payload.hours_worked || toNumber(payload.hours_worked) <= 0) {
    return "Debe ingresar las horas trabajadas";
  }

  if (payload.has_restriction && isBlank(payload.restriction_detail)) {
    return "Debe ingresar el detalle de la restriccion";
  }

  const crewWorkers = safeParseArray(payload.crew_workers).filter(
    (worker) =>
      !isBlank(worker?.name) ||
      !isBlank(worker?.role) ||
      !isBlank(worker?.hours) ||
      !isBlank(worker?.executed)
  );
  if (crewWorkers.length === 0) {
    return "Debe agregar al menos una persona en personal presente";
  }
  if (
    crewWorkers.some(
      (worker) =>
        isBlank(worker?.name) ||
        isBlank(worker?.role) ||
        !worker?.hours ||
        toNumber(worker.hours) <= 0 ||
        worker?.executed === undefined ||
        worker?.executed === null ||
        String(worker.executed).trim() === "" ||
        Number(worker.executed) < 0
    )
  ) {
    return "Cada persona presente debe tener nombre, cargo, horas y ejecutado";
  }

  return "";
}

router.get("/", (req, res) => {
  db.all("SELECT * FROM daily_logs ORDER BY date DESC, id DESC", [], (err, rows) => {
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
    capataz_signature,
  } = req.body;

  if (!master_item_id) {
    return res.status(400).json({
      error: "Falta master_item_id",
    });
  }

  const validationError = validateDailyLogPayload(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  db.get(
    "SELECT * FROM master_items WHERE id = ?",
    [Number(master_item_id)],
    (err, item) => {
      if (err) return res.status(500).json({ error: err.message });

      if (!item) {
        return res.status(404).json({ error: "Ítem no encontrado" });
      }

      const executedToday = toNumber(executed_today);

      const sql = `
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
        Number(master_item_id),
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

      db.run(sql, values, function (err) {
        if (err) return res.status(500).json({ error: err.message });

        const newExecutedQty = toNumber(item.executed_qty) + executedToday;

        db.run(
          `
          UPDATE master_items
          SET executed_qty = ?
          WHERE id = ?
          `,
          [newExecutedQty, Number(master_item_id)],
          (err) => {
            if (err) return res.status(500).json({ error: err.message });

            res.status(201).json({
              id: this.lastID,
              master_item_id: Number(master_item_id),
              project: project || item.project || "",
              tower: tower || item.tower || "",
              floor: floor || item.floor || "",
              activity: activity || item.activity || "",
              date: date || "",
              executed_today: executedToday,
              supervisor: supervisor || "",
              crew_name: crew_name || item.crew_name || "",
              crew_workers: safeParseArray(stringifyArray(crew_workers)),
              hours_worked: toNumber(hours_worked),
              has_restriction: Boolean(has_restriction),
              restriction_detail: restriction_detail || "",
              observations: observations || "",
              capataz_name: capataz_name || "",
              capataz_signature: capataz_signature || "",
            });
          }
        );
      });
    }
  );
});

router.put("/:id", (req, res) => {
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
  } = req.body;

  const validationError = validateDailyLogPayload(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  db.get("SELECT * FROM daily_logs WHERE id = ?", [id], (err, oldLog) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!oldLog) {
      return res.status(404).json({ error: "Reporte no encontrado" });
    }

    const oldExecuted = toNumber(oldLog.executed_today);
    const newExecuted = toNumber(executed_today);
    const difference = newExecuted - oldExecuted;

    const sql = `
      UPDATE daily_logs
      SET
        date = ?,
        executed_today = ?,
        supervisor = ?,
        crew_name = ?,
        crew_workers = ?,
        hours_worked = ?,
        has_restriction = ?,
        restriction_detail = ?,
        observations = ?,
        capataz_name = ?,
        capataz_signature = ?
      WHERE id = ?
    `;

    const values = [
      date || "",
      newExecuted,
      supervisor || "",
      crew_name || "",
      stringifyArray(crew_workers),
      toNumber(hours_worked),
      has_restriction ? 1 : 0,
      restriction_detail || "",
      observations || "",
      capataz_name || "",
      capataz_signature || "",
      id,
    ];

    db.run(sql, values, function (err) {
      if (err) return res.status(500).json({ error: err.message });

      db.run(
        `
        UPDATE master_items
        SET executed_qty = executed_qty + ?
        WHERE id = ?
        `,
        [difference, oldLog.master_item_id],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });

          res.json({
            id: Number(id),
            master_item_id: oldLog.master_item_id,
            date: date || "",
            executed_today: newExecuted,
            supervisor: supervisor || "",
            crew_name: crew_name || "",
            crew_workers: safeParseArray(stringifyArray(crew_workers)),
            hours_worked: toNumber(hours_worked),
            has_restriction: Boolean(has_restriction),
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

router.delete("/:id", (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM daily_logs WHERE id = ?", [id], (err, log) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!log) {
      return res.status(404).json({ error: "Reporte no encontrado" });
    }

    db.serialize(() => {
      db.run("DELETE FROM site_photos WHERE daily_log_id = ?", [id]);

      db.run("DELETE FROM daily_logs WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        res.json({
          message: "Reporte diario eliminado correctamente",
          deleted_id: Number(id),
        });
      });
    });
  });
});

module.exports = router;
