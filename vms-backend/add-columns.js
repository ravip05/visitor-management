// add-columns.js
const { db } = require('./db');

function runSql(sql) {
  return new Promise((resolve, reject) => {
    db.run(sql, (err) => {
      if (err) {
        console.log('SQL error (maybe already exists):', err.message);
        return resolve(false);
      }
      resolve(true);
    });
  });
}

(async () => {
  try {
    console.log('Adding columns if missing...');
    await runSql("ALTER TABLE visitors ADD COLUMN company TEXT;");
    await runSql("ALTER TABLE visitors ADD COLUMN personToMeet TEXT;");
    await runSql("ALTER TABLE visitors ADD COLUMN photo TEXT;");
    await runSql("ALTER TABLE visitors ADD COLUMN checkout_time INTEGER;");
    console.log('Done. (errors above are harmless if columns already exist)');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
