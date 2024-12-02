const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Supabase client setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase environment variables are missing");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Endpoint to save feedback
app.post("/api/feedback", async (req, res) => {
  const { model, type, response, rating } = req.body;

  if (!model || !type || !response || typeof rating !== "number" || rating < 1 || rating > 10) {
    return res.status(400).json({ error: "Invalid input. Rating must be between 1 and 10." });
  }

  try {
    const { data, error } = await supabase
      .from("feedback")
      .insert([{ model, type, response, rating }]);

    if (error) {
      throw error;
    }
    res.status(201).json(data);
  } catch (err) {
    console.error("Error saving feedback:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Endpoint to fetch all feedback
app.get("/api/feedback", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }
    res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching feedback:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
