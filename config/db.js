import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS
});

(async () => {
  const conn = await pool.getConnection();

  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
  await conn.query(`USE \`${process.env.DB_NAME}\`;`);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS demos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      local_id VARCHAR(255),
      user_id VARCHAR(255),
      place_name VARCHAR(255),
      latitude DOUBLE,
      longitude DOUBLE,
      description TEXT,
      mobile VARCHAR(50),
      contact_person VARCHAR(255),
      
      water_source VARCHAR(255),
      waterMeterNumber VARCHAR(255),
      electricityType VARCHAR(255),
      electricityMeterNumber VARCHAR(255),
      
      created_at BIGINT,
      updated_at BIGINT,
      server_id INT DEFAULT NULL,
      sync_status TINYINT DEFAULT 0
    );
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS demo_images (
      id INT AUTO_INCREMENT PRIMARY KEY,
      demo_id INT NOT NULL,
      image_path VARCHAR(500) NOT NULL,
      original_name VARCHAR(255),
      mime_type VARCHAR(100),
      file_size INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_demo_images_demo
        FOREIGN KEY (demo_id)
        REFERENCES demos(id)
        ON DELETE CASCADE
    )
  `);


  conn.release();
})();

export default pool;
