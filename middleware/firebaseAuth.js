import admin from "../config/firebase.js";

export default async function firebaseAuth(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  console.log("token>>>> ", token);
  
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    console.log("decoded >>> ", decoded);
    
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}
