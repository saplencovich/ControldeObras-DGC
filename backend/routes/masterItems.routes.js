const express = require("express");
const db = require("../db/connection");

const router = express.Router();
const TOWER_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const ACTIVITY_OPTIONS = [
  "Artefactos",
  "Luminarias",
  "Canalización",
  "Cableado",
  "Tableros",
];


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

function isBlank(value) {
  return !String(value || "").trim();
}

function getTowerOptions(towerCount) {
  const count = Number.isInteger(Number(towerCount)) ? Number(towerCount) : 1;
  return TOWER_LETTERS.slice(0, Math.min(Math.max(count, 1), TOWER_LETTERS.length)).map(
    (letter) => `Torre ${letter}`
  );
}

function validateProjectTower(projectName, tower, callback) {
  db.get("SELECT name, tower_count FROM projects WHERE name = ?", [projectName], (err, project) => {
    if (err) return callback(err);

    if (!project) {
      return callback(null, "La obra seleccionada no existe");
    }

    const validTowers = getTowerOptions(project.tower_count);
    if (!validTowers.includes(tower)) {
      return callback(
        null,
        `La torre seleccionada no pertenece a la obra. Debe ser una de: ${validTowers.join(", ")}`
      );
    }

    callback(null, "");
  });
}

function validateMasterItemPayload(payload) {
  const requiredFields = [
    [payload.project, "Debe seleccionar una obra/proyecto"],
    [payload.tower, "Debe ingresar una torre"],
    [payload.floor, "Debe seleccionar al menos un piso"],
    [payload.activity, "Debe ingresar una actividad"],
    [payload.start_date, "Debe ingresar la fecha de inicio"],
    [payload.end_date, "Debe ingresar la fecha de termino"],
    [payload.unit, "Debe ingresar una unidad"],
    [payload.crew_name, "Debe ingresar el nombre de la cuadrilla"],
    [payload.status, "Debe seleccionar un estado"],
    [payload.release_status, "Debe seleccionar el estado de liberacion"],
    [payload.observations, "Debe ingresar observaciones"],
  ];
  const missingField = requiredFields.find(([value]) => isBlank(value));
  if (missingField) return missingField[1];

  if (!payload.planned_qty || toNumber(payload.planned_qty) <= 0) {
    return "Debe ingresar una cantidad planificada mayor a 0";
  }

  if (!ACTIVITY_OPTIONS.includes(payload.activity)) {
    return "Debe seleccionar una actividad del catalogo definido";
  }

  const crewMembers = safeParseArray(payload.crew_members).filter(
    (member) => !isBlank(member?.name) || !isBlank(member?.role)
  );
  if (crewMembers.length === 0) {
    return "Debe agregar al menos una persona en Integrantes de la Cuadrilla";
  }
  const crewMemberNames = crewMembers
    .map((member) => String(member?.name || "").trim())
    .filter(Boolean);
  if (new Set(crewMemberNames).size !== crewMemberNames.length) {
    return "No se puede repetir el mismo integrante dentro de la cuadrilla";
  }
  if (crewMembers.some((member) => isBlank(member?.name) || isBlank(member?.role))) {
    return "Cada integrante de la cuadrilla debe tener nombre y cargo";
  }

  return "";
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

function getFloorValues(floor) {
  const floors = String(floor || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return floors.length > 0 ? floors : [""];
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

  const validationError = validateMasterItemPayload(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  validateProjectTower(project, tower, (err, towerValidationError) => {
    if (err) return res.status(500).json({ error: err.message });
    if (towerValidationError) return res.status(400).json({ error: towerValidationError });

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

    const buildItem = (id, floorValue) => ({
      id,
      project: project || "",
      tower: tower || "",
      floor: floorValue,
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

    const buildValues = (floorValue) => [
      project || "",
      tower || "",
      floorValue,
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

    const floorValues = getFloorValues(floor);
    const createdItems = [];

    db.serialize(() => {
      const statement = db.prepare(sql);

      const insertNext = (index) => {
        if (index >= floorValues.length) {
          statement.finalize((err) => {
            if (err) return res.status(500).json({ error: err.message });

            const firstItem = createdItems[0] || buildItem(null, "");
            return res.status(201).json({
              ...firstItem,
              created_items: createdItems,
            });
          });
          return;
        }

        const floorValue = floorValues[index];

        statement.run(buildValues(floorValue), function (err) {
          if (err) {
            statement.finalize(() => {});
            return res.status(500).json({ error: err.message });
          }

          createdItems.push(buildItem(this.lastID, floorValue));
          insertNext(index + 1);
        });
      };

      insertNext(0);
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

  const validationError = validateMasterItemPayload(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  validateProjectTower(project, tower, (err, towerValidationError) => {
    if (err) return res.status(500).json({ error: err.message });
    if (towerValidationError) return res.status(400).json({ error: towerValidationError });

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
        executed_qty = COALESCE(?, executed_qty),
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
      executed_qty === undefined || executed_qty === null || String(executed_qty).trim() === ""
        ? null
        : toNumber(executed_qty),
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
        return res.status(404).json({ error: "Item no encontrado" });
      }

      db.run(
        `
          UPDATE daily_logs
          SET project = ?,
              tower = ?,
              floor = ?,
              activity = ?
          WHERE master_item_id = ?
        `,
        [project || "", tower || "", floor || "", activity || "", id],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });

          db.get(
            "SELECT COALESCE(SUM(executed_today), 0) AS executed_qty FROM daily_logs WHERE master_item_id = ?",
            [id],
            (err, totals) => {
              if (err) return res.status(500).json({ error: err.message });

              db.run(
                "UPDATE master_items SET executed_qty = ? WHERE id = ?",
                [toNumber(totals?.executed_qty), id],
                (err) => {
                  if (err) return res.status(500).json({ error: err.message });

                  db.get("SELECT * FROM master_items WHERE id = ?", [id], (err, updatedItem) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json(updatedItem);
                  });
                }
              );
            }
          );
        }
      );
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

  const validationError = validateDailyLogPayload(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

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
