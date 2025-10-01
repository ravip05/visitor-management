/*
 scripts/reset-password.js
 Usage: node scripts/reset-password.js <username> <newPassword>
*/
const bcrypt = require('bcrypt');
const { run, get } = require('../db');

async function main(){
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node scripts/reset-password.js <username> <newPassword>');
    process.exit(1);
  }
  const [username, newPassword] = args;
  try {
    const user = await get('SELECT id, username FROM users WHERE username = ?', [username]);
    if (!user) {
      console.error('User not found:', username);
      process.exit(2);
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
    console.log(`Password for ${username} updated successfully.`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(3);
  }
}

main();
