const db = require('./db');
require('dotenv').config();

(async () => {
  try {
    console.log('Mendeteksi kolom pada tabel jadwal...');
    const dbName = process.env.DB_NAME;
    const [rows] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'jadwal'`,
      [dbName]
    );
    const set = new Set((rows || []).map(r => r.COLUMN_NAME));
    console.log('Kolom saat ini:', Array.from(set).join(', '));

    const needAdd = [];
    ['shift1','shift2','shift3','libur'].forEach(c => { if (!set.has(c)) needAdd.push(c); });
    if (needAdd.length === 0) {
      console.log('Semua kolom shift sudah ada — tidak perlu migrasi penambahan kolom.');
    } else {
      console.log('Menambahkan kolom:', needAdd.join(', '));
      for (const c of needAdd) {
        await db.query(`ALTER TABLE jadwal ADD COLUMN \`${c}\` varchar(100) NULL`);
        console.log('Ditambahkan', c);
      }
    }

    // Jika kolom personil1..4 ada, salin nilainya ke shift1..libur untuk semua baris
    if (set.has('personil1') || set.has('personil2') || set.has('personil3') || set.has('personil4')) {
      console.log('Menyalin data dari personil1..4 ke shift1..libur...');
      // lakukan update untuk semua baris; jika kolom shift sudah berisi nilai akan ditimpa
      await db.query(`UPDATE jadwal SET shift1 = personil1, shift2 = personil2, shift3 = personil3, libur = personil4`);
      console.log('Salinan selesai.');
    } else {
      console.log('Kolom personil1..4 tidak ditemukan, tidak ada data yang disalin.');
    }

    console.log('Selesai. Periksa tabel `jadwal` via phpMyAdmin atau jalankan SHOW COLUMNS FROM jadwal;');
    process.exit(0);
  } catch (err) {
    console.error('Gagal menjalankan migrasi:', err.message);
    process.exit(1);
  }
})();
