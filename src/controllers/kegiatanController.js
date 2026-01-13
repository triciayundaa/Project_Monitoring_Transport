const db = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT * FROM kegiatan
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("GET ALL ERROR:", err);
    res.status(500).json({ message: err.sqlMessage || err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      no_po,
      vendor,
      transporter,
      nama_kapal = '',
      material = '',
      incoterm = '',
      no_bl = '',
      quantity = 0,
      total_truk = 0,
      status = 'Waiting',
      tanggal_mulai,
      tanggal_selesai
    } = req.body;

    if (!no_po || !vendor || !transporter || !tanggal_mulai || !tanggal_selesai)
      return res.status(400).json({ message: 'Field wajib tidak boleh kosong' });

    const qty = Number(quantity) || 0;
    const truk = Number(total_truk) || 0;

    await db.query(
      `INSERT INTO kegiatan
      (no_po,vendor,transporter,nama_kapal,material,incoterm,no_bl,quantity,total_truk,status,tanggal_mulai,tanggal_selesai)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [no_po,vendor,transporter,nama_kapal,material,incoterm,no_bl,qty,truk,status,tanggal_mulai,tanggal_selesai]
    );

    res.status(201).json({ message: 'Kegiatan berhasil ditambahkan' });

  } catch (err) {
    console.log("MYSQL ERROR:", err);
    res.status(500).json({ message: err.sqlMessage || err.message });
  }
};


exports.update = async (req, res) => {
  try {
    const oldNoPo = req.params.old_no_po; 
    const data = req.body;

    if (!data.no_po || !data.vendor || !data.transporter || !data.tanggal_mulai || !data.tanggal_selesai) {
      return res.status(400).json({ message: 'Field wajib tidak boleh kosong' });
    }

    // cek jika user mengganti no_po ke yg sudah ada
    if (oldNoPo !== data.no_po) {
      const [cek] = await db.query(`SELECT no_po FROM kegiatan WHERE no_po = ?`, [data.no_po]);
      if (cek.length > 0) {
        return res.status(400).json({ message: 'No PO sudah dipakai' });
      }
    }

    await db.query(`
      UPDATE kegiatan SET
        no_po = ?,
        vendor = ?,
        transporter = ?,
        nama_kapal = ?,
        material = ?,
        incoterm = ?,
        no_bl = ?,
        quantity = ?,
        total_truk = ?,
        status = ?,
        tanggal_mulai = ?,
        tanggal_selesai = ?
      WHERE no_po = ?
    `, [
      data.no_po,
      data.vendor,
      data.transporter,
      data.nama_kapal || '',
      data.material || '',
      data.incoterm || '',
      data.no_bl || '',
      Number(data.quantity) || 0,
      Number(data.total_truk) || 0,
      data.status || 'Waiting',
      data.tanggal_mulai,
      data.tanggal_selesai,
      oldNoPo
    ]);

    res.json({ message: 'Update berhasil' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.sqlMessage || err.message });
  }
};



exports.remove = async (req, res) => {
    try {
        const { no_po } = req.params;

        await db.query(
            `DELETE FROM kegiatan WHERE no_po = ?`,
            [no_po]
        );

        res.json({ message: 'Kegiatan berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getDetail = async (req, res) => {
  try {
    const { no_po } = req.params;

    const [kegiatan] = await db.query(
      `SELECT * FROM kegiatan WHERE no_po = ?`,
      [no_po]
    );

    if (kegiatan.length === 0) {
      return res.status(404).json({ message: 'Kegiatan tidak ditemukan' });
    }

    const [truk] = await db.query(`
      SELECT
        kt.id,
        kt.tanggal,
        kt.no_seri_pengantar,
        kt.foto_truk,
        kt.foto_surat,
        kt.status,
        kt.keterangan,
        k.nopol,
        u.nama AS nama_personil,
        s.nama_shift
      FROM keberangkatan_truk kt
      LEFT JOIN kendaraan k ON kt.kendaraan_id = k.id
      LEFT JOIN users u ON kt.email_user = u.email
      LEFT JOIN shift s ON kt.shift_id = s.id
      WHERE kt.no_po = ?
      ORDER BY kt.created_at DESC
    `, [no_po]);

    const total_truk = truk.length;
    const terverifikasi = truk.filter(t => t.status === 'Valid').length;
    const tidak_valid = truk.filter(t => t.status === 'Tolak').length;
    const belum_terverifikasi = total_truk - terverifikasi - tidak_valid;

    res.json({
      kegiatan: kegiatan[0],
      truk,
      statistik: {
        total_truk,
        terverifikasi,
        belum_terverifikasi,
        tidak_valid
      }
    });

  } catch (err) {
    console.error("DETAIL ERROR:", err);
    res.status(500).json({ message: err.sqlMessage || err.message });
  }
};



