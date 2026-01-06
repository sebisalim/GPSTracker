import express from "express";
import demoController from "../controllers/demoController.js";
import firebaseAuth from "../middleware/firebaseAuth.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// Sync (offline → server)
router.post("/sync", firebaseAuth, demoController.sync);

// CRUD
router.get("/", firebaseAuth, demoController.list);
router.get("/:id", firebaseAuth, demoController.get);
router.put("/:id", firebaseAuth, demoController.update);
router.delete("/:id", firebaseAuth, demoController.delete);

// New poat api
router.post(
    "/syncNew",
    firebaseAuth,
     upload.array("photos", 10),
    demoController.syncNew
);



export default router;
