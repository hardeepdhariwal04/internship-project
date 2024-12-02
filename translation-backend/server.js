const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL connection setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Vercel PostgreSQL SSL
  },
});

// Endpoint to save feedback
app.post("/api/feedback", async (req, res) => {
  const { model, type, response, rating } = req.body;

  if (!model || !type || !response || typeof rating !== "number" || rating < 1 || rating > 10) {
    return res.status(400).json({ error: "Invalid input. Rating must be between 1 and 10." });
  }

  try {
    const query = `
      INSERT INTO feedback (model, type, response, rating)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [model, type, response, rating];

    const { rows } = await pool.query(query, values);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error saving feedback:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Endpoint to fetch all feedback
app.get("/api/feedback", async (req, res) => {
  try {
    const query = `
      SELECT * FROM feedback
      ORDER BY created_at DESC;
    `;
    const { rows } = await pool.query(query);
    res.status(200).json(rows);
  } catch (err) {
    console.error("Error fetching feedback:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

