import pool from "../config/db.js";

export default {

  // Sync from client → server
  sync: async (req, res) => {
    const uid = req.user.uid;
    const records = req.body.demos;
    const synced = [];

    for (let r of records) {
      // Check if the local_id already exists for this user
      const [existingRecord] = await pool.query(
        `SELECT * FROM demos WHERE local_id = ? AND user_id = ?`,
        [r.local_id, uid]
      );

      // If the record exists, skip it (do not insert)
      if (existingRecord.length > 0) {
        continue; // Skip the current record as it already exists
      }

      // Insert new record into the database
      const [result] = await pool.query(
        `INSERT INTO demos
       (local_id, user_id, place_name, latitude, longitude, description, mobile, contact_person, created_at, updated_at, sync_status)
       VALUES (?,?,?,?,?,?,?,?,?,?,1)`,
        [
          r.local_id,
          uid,
          r.place_name,
          r.latitude,
          r.longitude,
          r.description,
          r.mobile,
          r.contact_person,
          r.created_at,
          r.updated_at
        ]
      );

      // Add synced record with server ID
      synced.push({
        local_id: r.local_id,
        server_id: result.insertId
      });
    }

    res.json({ success: true, synced });
  },

  // List records
  list: async (req, res) => {
    const uid = req.user.uid;

    const [rows] = await pool.query(
      `SELECT * FROM demos WHERE user_id=? ORDER BY created_at DESC`,
      [uid]
    );

    res.json(rows);
  },

  // Detail
  get: async (req, res) => {
    const { id } = req.params;
    const uid = req.user.uid;

    const [rows] = await pool.query(
      `SELECT * FROM demos WHERE id=? AND user_id=?`,
      [id, uid]
    );

    if (rows.length === 0) return res.status(404).json({ message: "Not found" });

    res.json(rows[0]);
  },

  // Update
  update: async (req, res) => {
    const { id } = req.params;
    const uid = req.user.uid;
    const data = req.body;

    const [result] = await pool.query(
      `UPDATE demos SET
        place_name=?, latitude=?, longitude=?,
        description=?, mobile=?, contact_person=?, updated_at=?
       WHERE id=? AND user_id=?`,
      [
        data.place_name,
        data.latitude,
        data.longitude,
        data.description,
        data.mobile,
        data.contact_person,
        Date.now(),
        id,
        uid
      ]
    );

    res.json({ success: true });
  },

  // Delete
  delete: async (req, res) => {
    const { id } = req.params;
    const uid = req.user.uid;

    await pool.query(
      `DELETE FROM demos WHERE id=? AND user_id=?`,
      [id, uid]
    );

    res.json({ success: true });
  }
};
