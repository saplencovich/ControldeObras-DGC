const db = require("./connection");

function initDatabase() {
  db.serialize(() => {
    db.run("PRAGMA foreign_keys = ON");

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
      crew_size INTEGER DEFAULT 0,
      crew_members TEXT DEFAULT '[]',
      restrictions TEXT DEFAULT '',
      observations TEXT DEFAULT '',
      status TEXT DEFAULT 'pendiente',
      release_status TEXT DEFAULT 'no_liberado',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS daily_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        master_item_id INTEGER NOT NULL,
        project TEXT DEFAULT '',
        tower TEXT DEFAULT '',
        floor TEXT DEFAULT '',
        activity TEXT DEFAULT '',
        date TEXT DEFAULT '',
        executed_today REAL DEFAULT 0,
        supervisor TEXT DEFAULT '',
        crew_name TEXT DEFAULT '',
        crew_workers TEXT DEFAULT '[]',
        hours_worked REAL DEFAULT 0,
        has_restriction INTEGER DEFAULT 0,
        restriction_detail TEXT DEFAULT '',
        observations TEXT DEFAULT '',
        capataz_name TEXT DEFAULT '',
        capataz_signature TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(master_item_id) REFERENCES master_items(id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS site_photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        daily_log_id INTEGER,
        master_item_id INTEGER,
        file_url TEXT DEFAULT '',
        description TEXT DEFAULT '',
        label TEXT DEFAULT '',
        date TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(daily_log_id) REFERENCES daily_logs(id) ON DELETE CASCADE,
      FOREIGN KEY(master_item_id) REFERENCES master_items(id) ON DELETE CASCADE
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT DEFAULT '',
        entity_name TEXT DEFAULT '',
        entity_id TEXT DEFAULT '',
        user_name TEXT DEFAULT '',
        user_email TEXT DEFAULT '',
        description TEXT DEFAULT '',
        previous_data TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS project_workers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT '',
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT DEFAULT 'viewer',
        allowed_projects TEXT DEFAULT '[]',
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });
}

module.exports = initDatabase;