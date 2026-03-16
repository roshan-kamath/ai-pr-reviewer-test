require("dotenv").config();
require("express-async-errors");

const express = require("express");
const { handleWebhook } = require("./webhook");
const { validateEnv } = require("./utils");

// Validate all required environment variables on startup
validateEnv();

const app = express();
const PORT = process.env.PORT || 3000;

// Parse raw body for webhook signature verification
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// GitHub webhook endpoint
app.post("/webhook", handleWebhook);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`✅ AI PR Reviewer running on port ${PORT}`);
  console.log(`   Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`   Health check:     http://localhost:${PORT}/health`);
});