import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import s3 from "../config/s3.js";

/* ---------- UPLOAD ---------- */
export const uploadFile = async (file) => {
  try {
    if (!file) {
      throw new Error("No file uploaded");
    }

    const ext = path.extname(file.originalname);
    const fileName = `${uuidv4()}${ext}`;
    const fileStream = fs.createReadStream(file.path);

    console.log('fileName >>> ', fileName);

    const key = `uploads/${fileName}`;

    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: fileStream,
      ContentType: file.mimetype,
      StorageClass: "INTELLIGENT_TIERING",
    };

    await s3.upload(params).promise();

    // remove temp file
    // fs.unlinkSync(file.path);

    // ✅ CLOSE stream first
    fileStream.close();

    console.log('file.path >>> ', file.path);
    
    // ✅ Delete temp file safely
    await fs.unlink(file.path, (err) => {
      if (err) console.error("Temp file delete error:", err);
    });

    return key;

  } catch (err) {
    console.log(err);
    throw new Error("No file uploaded");
  }
};

/* ---------- GET SIGNED URL ---------- */
export const getSignedUrl = (key) => {
  if (!key) {
    throw new Error("Key required");
  }

  const url = s3.getSignedUrl("getObject", {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
    Expires: 60, // seconds
  });

  return url
};

/* ---------- DELETE ---------- */
export const deleteFile = async (req, res) => {
  const { key } = req.body;

  try {
    await s3
      .deleteObject({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
      })
      .promise();

    res.json({ message: "File deleted successfully" });
  } catch (err) {
    console.log(err);
    throw new Error("Delete failed");
  }
};
