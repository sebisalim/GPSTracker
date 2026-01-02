import express from "express";
import cors from "cors";
import demoRoutes from "./routes/demos.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/demos", demoRoutes);

export default app;
