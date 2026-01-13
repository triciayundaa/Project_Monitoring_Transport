const db = require('../config/db');

exports.verifikasiKeberangkatan = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Valid', 'Tolak'].includes(status)) {
      return res.status(400).json({ message: 'Status tidak valid' });
    }

    await db.query(
      'UPDATE keberangkatan_truk SET status = ? WHERE id = ?',
      [status, id]
    );

    res.json({ message: 'Status berhasil diperbarui' });
  } catch (err) {
    console.error('VERIFIKASI ERROR:', err);
    res.status(500).json({ message: err.sqlMessage || err.message });
  }
};
