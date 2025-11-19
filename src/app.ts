// src/app.ts
import express from "express";
import assetsRoutes from "./routes/assetsRoutes.js";
import {requestLogger} from "#middleware/requestLogger.js";
import {health} from "#middleware/health.js";
import {errorHandler, notFound} from "#middleware/errors.js";

const app = express();

app.use(express.json()); // 👈 body-parser eerst
app.use(requestLogger); // 👈

app.get("/api/health", health);
app.use("/api/assets", assetsRoutes);

app.use(notFound);
app.use(errorHandler);
app.use((req, res) => {
    res.status(404).json({ error: { code: "not_found", message: "Route not found" } });
});

export default app;
