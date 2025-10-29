import {errorHandler, notFound} from "#middleware/errors.js";
import { health } from "#middleware/health.js";
import { requestLogger } from "#middleware/requestLogger.js";
import express from "express";

const app = express();
const port = process.env.PORT ?? "3000";

app.use(express.json());   // 👈 body-parser eerst
app.use(requestLogger);    // 👈

app.get("/api/health", health);

app.use(notFound);
app.use(errorHandler);
app.use((req, res) => {
    res.status(404).json({ error: { code: 'not_found', message: 'Route not found' } });
});

app.listen(port, () => {
    console.log(`API listening on :${port}`);
});
