const db = require('./db');
require('dotenv').config();

(async () => {
  try {
    console.log('Resetting jadwal tables...');

    // If jadwal_shift exists, drop it
    const [existing] = await db.query("SHOW TABLES LIKE 'jadwal_shift'");
    if (existing && existing.length) {
      console.log('Dropping existing jadwal_shift...');
      await db.query('DROP TABLE IF EXISTS jadwal_shift');
    }

    // Create new jadwal_shift table
    const create = `
      CREATE TABLE jadwal_shift (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tanggal DATE NOT NULL,
        shift1 VARCHAR(100),
        shift2 VARCHAR(100),
        shift3 VARCHAR(100),
        libur VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_tanggal (tanggal)
      );
    `;
    await db.query(create);
    console.log('Created jadwal_shift table.');

    // If old jadwal table exists, try to copy its data
    const [hasJadwal] = await db.query("SHOW TABLES LIKE 'jadwal'");
    if (hasJadwal && hasJadwal.length) {
      console.log('Found old jadwal table — copying existing data into jadwal_shift...');
      // determine available columns
      const [cols] = await db.query("SHOW COLUMNS FROM jadwal");
      const colNames = (cols||[]).map(c => c.Field);
      const sourceCols = [];
      if (colNames.includes('shift1')) sourceCols.push('shift1');
      else if (colNames.includes('personil1')) sourceCols.push('personil1');
      if (colNames.includes('shift2')) sourceCols.push('shift2');
      else if (colNames.includes('personil2')) sourceCols.push('personil2');
      if (colNames.includes('shift3')) sourceCols.push('shift3');
      else if (colNames.includes('personil3')) sourceCols.push('personil3');
      if (colNames.includes('libur')) sourceCols.push('libur');
      else if (colNames.includes('personil4')) sourceCols.push('personil4');

      if (sourceCols.length >= 4) {
        const sql = `INSERT INTO jadwal_shift (tanggal, shift1, shift2, shift3, libur) SELECT tanggal, ${sourceCols.slice(0,4).join(', ')} FROM jadwal ON DUPLICATE KEY UPDATE shift1=VALUES(shift1), shift2=VALUES(shift2), shift3=VALUES(shift3), libur=VALUES(libur)`;
        await db.query(sql);
        console.log('Copied data from jadwal into jadwal_shift (merged duplicates).');
      } else {
        console.log('No suitable columns found to copy from jadwal.');
      }

      console.log('Dropping old jadwal table...');
      await db.query('DROP TABLE IF EXISTS jadwal');
      console.log('Dropped jadwal.');
    } else {
      console.log('No old jadwal table found.');
    }

    console.log('Reset complete.');
    process.exit(0);
  } catch (err) {
    console.error('Failed resetting jadwal_shift:', err.message);
    process.exit(1);
  }
})();
