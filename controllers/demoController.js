import pool from "../config/db.js";
import { uploadFile, getSignedUrl, deleteFile } from "../utils/fileupload.js";

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

    // const [rows] = await pool.query(
    //   `SELECT * FROM demos WHERE user_id=? ORDER BY created_at DESC`,
    //   [uid]
    // );

    const [rows] = await pool.query(
      `
      SELECT 
        d.*,
        di.id AS image_id,
        di.image_path,
        di.original_name
      FROM demos d
      LEFT JOIN demo_images di ON di.demo_id = d.id
      WHERE d.user_id = ?
      ORDER BY d.created_at DESC
      `,
      [uid]
    );

    // Group images per demo
    const map = {};

    for (const row of rows) {
      if (!map[row.id]) {
        map[row.id] = {
          id: row.id,
          place_name: row.place_name,
          latitude: row.latitude,
          longitude: row.longitude,
          description: row.description,
          mobile: row.mobile,
          contact_person: row.contact_person,
          created_at: row.created_at,
          updated_at: row.updated_at,
          images: []
        };
      }

      if (row.image_path) {
        const url = await getSignedUrl(row.image_path);

        map[row.id].images.push({
          id: row.image_id,
          url
        });
      }
    }

    res.json(Object.values(map));

    // res.json(rows);
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
  },

  //  NEW SYNC WITH FILE UPLOAD
  syncNew: async (req, res) => {
    const uid = req.user.uid;

    const {
      local_id,
      place_name,
      latitude,
      longitude,
      description,
      mobile,
      contact_person,
      water_source,
      waterMeterNumber,
      electricityType,
      electricityMeterNumber,
      created_at,
      updated_at,
    } = req.body;

    try {
      // CHECK IF DEMO EXISTS
      const [rows] = await pool.query(
        `SELECT id FROM demos WHERE local_id = ? AND user_id = ?`,
        [local_id, uid]
      );

      let demoId;

      // ADD OR UPDATE DEMO
      if (rows.length > 0) {
        //  UPDATE
        demoId = rows[0].id;

        await pool.query(
          `UPDATE demos SET
          place_name = ?, latitude = ?, longitude = ?, description = ?, mobile = ?, contact_person = ?, water_source = ?, waterMeterNumber = ?, electricityType = ?, electricityMeterNumber = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
          [
            place_name,
            latitude,
            longitude,
            description,
            mobile,
            contact_person,
            water_source,
            waterMeterNumber,
            electricityType,
            electricityMeterNumber,
            updated_at,
            demoId,
            uid,
          ]
        );

        // DELETE ALL OLD IMAGES
        const [oldImages] = await pool.query(
          `SELECT image_path FROM demo_images WHERE demo_id = ?`,
          [demoId]
        );

        for (const img of oldImages) {
          await deleteFile(img.image_path);
        }

        await pool.query(
          `DELETE FROM demo_images WHERE demo_id = ?`,
          [demoId]
        );

      } else {
        //  ADD
        const [result] = await pool.query(
          `INSERT INTO demos
         (local_id, user_id, place_name, latitude, longitude, description, mobile, contact_person, water_source, waterMeterNumber, electricityType, electricityMeterNumber, created_at, updated_at, sync_status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
          [
            local_id,
            uid,
            place_name,
            latitude,
            longitude,
            description,
            mobile,
            contact_person,
            water_source,
            waterMeterNumber,
            electricityType,
            electricityMeterNumber,
            created_at,
            updated_at,
          ]
        );

        demoId = result.insertId;
      }

      // UPLOAD NEW FILES
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const key = await uploadFile(file);
          console.log('key === ', key);

          await pool.query(
            `INSERT INTO demo_images
           (demo_id, image_path, original_name, mime_type, file_size)
           VALUES (?,?,?,?,?)`,
            [
              demoId,
              key,
              file.originalname,
              file.mimetype,
              file.size,
            ]
          );
        }
      }

      // 4️⃣ Response for mobile
      res.json({
        success: true,
        synced: [
          {
            local_id,
            server_id: demoId,
          },
        ],
      });
    } catch (err) {
      console.error("syncNew error:", err);
      res.status(500).json({
        success: false,
        message: "Sync failed",
      });
    }
  },

};
