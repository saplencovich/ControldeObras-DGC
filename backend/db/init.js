const db = require("./connection");

function initDatabase() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        client TEXT DEFAULT '',
        address TEXT DEFAULT '',
        description TEXT DEFAULT '',
        status TEXT DEFAULT 'activa',
        start_date TEXT DEFAULT '',
        end_date TEXT DEFAULT '',
        supervisor TEXT DEFAULT '',
        capataz TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS master_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project TEXT DEFAULT '',
        tower TEXT DEFAULT '',
        floor TEXT DEFAULT '',
        activity TEXT DEFAULT '',
        start_date TEXT DEFAULT '',
        end_date TEXT DEFAULT '',
        planned_qty REAL DEFAULT 0,
        executed_qty REAL DEFAULT 0,
        unit TEXT DEFAULT '',
        crew_name TEXT DEFAULT '',
        restrictions TEXT DEFAULT '',
        status TEXT DEFAULT 'pendiente',
        release_status TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS daily_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        master_item_id INTEGER NOT NULL,
        date TEXT DEFAULT '',
        executed_today REAL DEFAULT 0,
        supervisor TEXT DEFAULT '',
        crew_workers TEXT DEFAULT '[]',
        hours_worked REAL DEFAULT 0,
        has_restriction INTEGER DEFAULT 0,
        observations TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(master_item_id) REFERENCES master_items(id)
      )
    `);
  });
}

module.exports = initDatabase;