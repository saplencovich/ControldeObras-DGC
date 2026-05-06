const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database("./database.sqlite", (err) => {
  if (err) {
    console.error("Error conectando a SQLite:", err.message);
  } else {
    console.log("Base de datos SQLite conectada");
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS master_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project TEXT,
      tower TEXT,
      floor TEXT,
      activity TEXT,
      start_date TEXT,
      end_date TEXT,
      planned_qty REAL DEFAULT 0,
      executed_qty REAL DEFAULT 0,
      unit TEXT,
      crew_name TEXT,
      restrictions TEXT,
      status TEXT DEFAULT 'pendiente',
      release_status TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS daily_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      master_item_id INTEGER,
      date TEXT,
      executed_today REAL DEFAULT 0,
      supervisor TEXT,
      crew_workers TEXT,
      hours_worked REAL DEFAULT 0,
      has_restriction INTEGER DEFAULT 0,
      observations TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(master_item_id) REFERENCES master_items(id)
    )
  `);
});

function parseDailyLog(row) {
  return {
    ...row,
    crew_workers: row.crew_workers ? JSON.parse(row.crew_workers) : [],
    has_restriction: Boolean(row.has_restriction),
  };
}

function calculateDashboardSummary(masterItems, dailyLogs) {
  const plannedItems = masterItems.length;

  const plannedTotal = masterItems.reduce((sum, item) => {
    return sum + Number(item.planned_qty || 0);
  }, 0);

  const executedTotal = masterItems.reduce((sum, item) => {
    return sum + Number(item.executed_qty || 0);
  }, 0);

  const weightedProgress =
    plannedTotal > 0 ? Math.round((executedTotal / plannedTotal) * 100) : 0;

  const blocked = masterItems.filter(
    (item) => item.status === "bloqueado"
  ).length;

  const completed = masterItems.filter(
    (item) => item.status === "completado"
  ).length;

  const inProgress = masterItems.filter(
    (item) => item.status === "en_ejecucion"
  ).length;

  const pending = masterItems.filter(
    (item) => item.status === "pendiente"
  ).length;

  return {
    planned_items: plannedItems,
    planned_total: plannedTotal,
    executed_total: executedTotal,
    weighted_progress: weightedProgress,
    blocked,
    completed,
    in_progress: inProgress,
    pending,
    daily_reports: dailyLogs.length,
  };
}

// ==========================
// RUTA BASE
// ==========================

app.get("/", (req, res) => {
  res.json({
    message: "Backend local funcionando correctamente",
    project: "Control de Obras",
  });
});

// ==========================
// PROJECTS TEMPORALES
// ==========================

app.get("/api/projects", (req, res) => {
  db.all(
    `
    SELECT DISTINCT project as name
    FROM master_items
    WHERE project IS NOT NULL AND project != ''
    ORDER BY project ASC
    `,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const projects = rows.map((row, index) => ({
        id: index + 1,
        name: row.name,
      }));

      res.json(projects);
    }
  );
});

app.post("/api/projects", (req, res) => {
  const { name } = req.body;

  res.status(201).json({
    id: Date.now(),
    name,
    message: "Proyecto creado de forma temporal",
  });
});

// ==========================
// MASTER ITEMS
// ==========================

app.get("/api/master-items", (req, res) => {
  const { project, tower, floor, activity, status } = req.query;

  let sql = "SELECT * FROM master_items WHERE 1 = 1";
  const params = [];

  if (project) {
    sql += " AND project = ?";
    params.push(project);
  }

  if (tower) {
    sql += " AND tower = ?";
    params.push(tower);
  }

  if (floor) {
    sql += " AND floor = ?";
    params.push(floor);
  }

  if (activity) {
    sql += " AND activity = ?";
    params.push(activity);
  }

  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }

  sql += " ORDER BY id DESC";

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(rows);
  });
});

app.get("/api/master-items/:id", (req, res) => {
  const { id } = req.params;

  db.get("SELECT * FROM master_items WHERE id = ?", [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!row) {
      return res.status(404).json({ error: "Item no encontrado" });
    }

    res.json(row);
  });
});

app.post("/api/master-items", (req, res) => {
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
      if (err) {
        return res.status(500).json({ error: err.message });
      }

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

app.put("/api/master-items/:id", (req, res) => {
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
      if (err) {
        return res.status(500).json({ error: err.message });
      }

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

app.delete("/api/master-items/:id", (req, res) => {
  const { id } = req.params;

  db.serialize(() => {
    db.run("DELETE FROM daily_logs WHERE master_item_id = ?", [id]);

    db.run("DELETE FROM master_items WHERE id = ?", [id], function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        message: "Ítem eliminado correctamente",
      });
    });
  });
});

// ==========================
// DAILY LOGS
// ==========================

app.get("/api/daily-logs", (req, res) => {
  db.all("SELECT * FROM daily_logs ORDER BY date DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(rows.map(parseDailyLog));
  });
});

app.get("/api/master-items/:id/daily-logs", (req, res) => {
  const { id } = req.params;

  db.all(
    "SELECT * FROM daily_logs WHERE master_item_id = ? ORDER BY date DESC",
    [id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json(rows.map(parseDailyLog));
    }
  );
});

app.post("/api/master-items/:id/daily-logs", (req, res) => {
  const { id } = req.params;

  const {
    date,
    executed_today,
    supervisor,
    crew_workers,
    hours_worked,
    has_restriction,
    observations,
  } = req.body;

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
      Number(id),
      date || "",
      Number(executed_today || 0),
      supervisor || "",
      JSON.stringify(crew_workers || []),
      Number(hours_worked || 0),
      has_restriction ? 1 : 0,
      observations || "",
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      db.run(
        `
        UPDATE master_items
        SET executed_qty = executed_qty + ?
        WHERE id = ?
        `,
        [Number(executed_today || 0), Number(id)]
      );

      res.status(201).json({
        id: this.lastID,
        master_item_id: Number(id),
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

// Ruta compatible con tu Dashboard actual.
// Si el formulario envía master_item_id, también funciona por esta ruta.
app.post("/api/daily-logs", (req, res) => {
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
      error: "Falta master_item_id para crear el reporte diario",
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
      if (err) {
        return res.status(500).json({ error: err.message });
      }

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

app.delete("/api/daily-logs/:id", (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM daily_logs WHERE id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({
      message: "Reporte diario eliminado correctamente",
    });
  });
});

// ==========================
// SITE PHOTOS TEMPORAL
// ==========================

app.get("/api/site-photos", (req, res) => {
  res.json([]);
});

app.delete("/api/site-photos/:id", (req, res) => {
  res.json({
    message: "Foto eliminada de forma temporal",
  });
});

// ==========================
// AUDIT LOGS TEMPORAL
// ==========================

app.post("/api/audit-logs", (req, res) => {
  console.log("Audit log local:", req.body);

  res.status(201).json({
    id: Date.now(),
    ...req.body,
  });
});

// ==========================
// DASHBOARD SUMMARY
// ==========================

app.get("/api/dashboard/summary", (req, res) => {
  db.all("SELECT * FROM master_items", [], (err, masterItems) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    db.all("SELECT * FROM daily_logs", [], (err, dailyLogs) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const summary = calculateDashboardSummary(masterItems, dailyLogs);

      res.json(summary);
    });
  });
});

// ==========================
// SEED DATA DASHBOARD
// ==========================

app.post("/api/seed-dashboard", (req, res) => {
  db.serialize(() => {
    db.run("DELETE FROM daily_logs");
    db.run("DELETE FROM master_items");

    const items = [
      {
        project: "Edificio Centro",
        tower: "Torre A",
        floor: "Piso 1",
        activity: "Artefactos",
        start_date: "2026-05-01",
        end_date: "2026-05-10",
        planned_qty: 100,
        executed_qty: 35,
        unit: "un",
        crew_name: "Cuadrilla Norte",
        restrictions: "",
        status: "en_ejecucion",
        release_status: "liberado",
      },
      {
        project: "Edificio Centro",
        tower: "Torre A",
        floor: "Piso 2",
        activity: "Luminarias",
        start_date: "2026-05-03",
        end_date: "2026-05-12",
        planned_qty: 80,
        executed_qty: 80,
        unit: "un",
        crew_name: "Cuadrilla Norte",
        restrictions: "",
        status: "completado",
        release_status: "liberado",
      },
      {
        project: "Edificio Centro",
        tower: "Torre B",
        floor: "Piso 1",
        activity: "Canalización",
        start_date: "2026-05-05",
        end_date: "2026-05-20",
        planned_qty: 150,
        executed_qty: 40,
        unit: "ml",
        crew_name: "Cuadrilla Sur",
        restrictions: "Falta liberación de frente de trabajo",
        status: "bloqueado",
        release_status: "pendiente",
      },
      {
        project: "Edificio Centro",
        tower: "Torre B",
        floor: "Piso 3",
        activity: "Cableado",
        start_date: "2026-05-08",
        end_date: "2026-05-25",
        planned_qty: 200,
        executed_qty: 20,
        unit: "ml",
        crew_name: "Cuadrilla Cableado",
        restrictions: "",
        status: "pendiente",
        release_status: "pendiente",
      },
      {
        project: "Edificio Centro",
        tower: "Torre C",
        floor: "Piso 4",
        activity: "Tableros",
        start_date: "2026-05-10",
        end_date: "2026-05-28",
        planned_qty: 20,
        executed_qty: 5,
        unit: "un",
        crew_name: "Cuadrilla Tableros",
        restrictions: "",
        status: "en_ejecucion",
        release_status: "liberado",
      },
    ];

    const insertItem = db.prepare(`
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
    `);

    items.forEach((item) => {
      insertItem.run([
        item.project,
        item.tower,
        item.floor,
        item.activity,
        item.start_date,
        item.end_date,
        item.planned_qty,
        item.executed_qty,
        item.unit,
        item.crew_name,
        item.restrictions,
        item.status,
        item.release_status,
      ]);
    });

    insertItem.finalize();

    const logs = [
      [
        1,
        "2026-05-02",
        10,
        "Samuel",
        ["Juan", "Pedro"],
        8,
        0,
        "Inicio de instalación",
      ],
      [
        1,
        "2026-05-03",
        15,
        "Samuel",
        ["Juan", "Pedro"],
        8,
        0,
        "Avance normal",
      ],
      [
        1,
        "2026-05-04",
        10,
        "Samuel",
        ["Juan", "Pedro"],
        8,
        0,
        "Trabajo sin novedades",
      ],
      [
        2,
        "2026-05-04",
        40,
        "Carlos",
        ["Luis", "Miguel"],
        8,
        0,
        "Primer tramo terminado",
      ],
      [
        2,
        "2026-05-05",
        40,
        "Carlos",
        ["Luis", "Miguel"],
        8,
        0,
        "Actividad terminada",
      ],
      [
        3,
        "2026-05-06",
        20,
        "Felipe",
        ["Andrés", "Marco"],
        8,
        1,
        "Restricción por frente no liberado",
      ],
      [
        3,
        "2026-05-07",
        20,
        "Felipe",
        ["Andrés", "Marco"],
        8,
        1,
        "Continúa restricción",
      ],
      [
        4,
        "2026-05-08",
        20,
        "Diego",
        ["José", "Matías"],
        8,
        0,
        "Inicio de cableado",
      ],
      [
        5,
        "2026-05-10",
        5,
        "Roberto",
        ["Nicolás", "Tomás"],
        8,
        0,
        "Montaje inicial",
      ],
    ];

    const insertLog = db.prepare(`
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
    `);

    logs.forEach((log) => {
      insertLog.run([
        log[0],
        log[1],
        log[2],
        log[3],
        JSON.stringify(log[4]),
        log[5],
        log[6],
        log[7],
      ]);
    });

    insertLog.finalize();
  });

  res.json({
    message: "Datos de prueba del Dashboard cargados correctamente",
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});