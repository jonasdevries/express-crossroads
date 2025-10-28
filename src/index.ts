import { health } from "#middleware/health.js";
// index.ts
import express from "express";

const app = express();
const port = process.env.PORT ?? "3000";

app.get("/api/health", health);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
