const express = require("express");
const { Pool } = require("pg");

// Use your Render PostgreSQL connection string
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // required for Render
});

// Test connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) console.error("DB connection error", err);
  else console.log("DB connected:", res.rows[0]);
});
const cors = require("cors");
const path = require("path");          // ← ADD THIS

const app = express();
app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, "public")));  // ← AND THIS
// ---------- DATA STORES ----------
const venues = [];
const schedules = [];

// ---------- HELPER FUNCTIONS ----------
function hasConflict(venue, date, start, end) {
  return schedules.some(s =>
    s.venue === venue &&
    s.date === date &&
    start < s.end &&
    end > s.start
  );
}

// ---------- ROUTES ----------

// Health check
app.get("/", (req, res) => {
  res.send("Science Scheduler server is running");
});

// ----- VENUE ROUTES -----

// Create venue
app.post("/venues", async (req, res) => {
  const { name, capacity } = req.body;
  if (!name || !capacity) return res.status(400).json({ error: "Name and capacity required" });

  try {
    const result = await pool.query(
      "INSERT INTO venues (name, capacity) VALUES ($1, $2) RETURNING *",
      [name, capacity]
    );
    res.json({ message: "Venue added", venue: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

// ----- SCHEDULE ROUTES -----

// Create lecture/exam schedule
app.post("/schedule", async (req, res) => {
  const { course, venue, date, start, end, department, level } = req.body;
  if (!course || !venue || !date || !start || !end || !department || !level) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // Check for conflicts
    const conflict = await pool.query(
      `SELECT * FROM lectures WHERE venue = $1 AND date = $2 
       AND (($3 >= start AND $3 < end) OR ($4 > start AND $4 <= end))`,
      [venue, date, start, end]
    );
    if (conflict.rows.length > 0)
      return res.status(400).json({ error: "Venue already booked at that time" });

    const result = await pool.query(
      `INSERT INTO lectures (course, venue, date, start, end, department, level)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [course, venue, date, start, end, department, level]
    );
    res.json({ message: "Lecture scheduled", lecture: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

// ---------- START SERVER ----------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


