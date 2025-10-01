// db.js
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Always point to vms-backend/vms.sqlite
const DB_FILE = path.resolve(__dirname, "vms.sqlite");
console.log("Using DB file:", DB_FILE);

const MIGRATIONS = path.join(__dirname, "migrations.sql");
const db = new sqlite3.Database(DB_FILE);

// Run migrations on startup
if (fs.existsSync(MIGRATIONS)) {
  const sql = fs.readFileSync(MIGRATIONS, "utf8");
  db.exec(sql, (err) => {
    if (err) {
      console.error("Failed to run migrations:", err);
    } else {
      console.log("Migrations applied");
    }
  });
}

// Wrap helpers with promises
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = { db, run, get, all };
