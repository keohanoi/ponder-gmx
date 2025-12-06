import { Hono } from "hono";

const app = new Hono();

// Basic hello endpoint for testing
app.get("/hello", (c) => {
  return c.text("Hello, GMX Indexer!");
});

export default app;