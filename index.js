const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const path = require("path");
const LECTURER_TOKEN = process.env.LECTURER_TOKEN || "dev-secret-123";

// Connect to Render PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Test connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) console.error("DB connection error", err);
  else console.log("DB connected:", res.rows[0]);
});

const app = express();
app.use(express.json());
app.use(cors());
function lecturerAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Missing authorization header" });
  }

  const token = authHeader.split(" ")[1];

  if (token !== LECTURER_TOKEN) {
    return res.status(403).json({ error: "Invalid lecturer token" });
  }

  next();
}

// Health check
app.get("/", (req, res) => {
  res.send("Science Scheduler server is running");
});

// --------------------- Venues ---------------------

// Get all venues
app.get("/venues", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM venues ORDER BY id");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

// Add a venue
app.post("/venues", async (req, res) => {
  const { name, capacity } = req.body;
  if (!name || !capacity)
    return res.status(400).json({ error: "Name and capacity are required" });

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

// --------------------- Lectures ---------------------

// Get all lectures (optional: filter by department & level)
app.get("/lectures", async (req, res) => {
  const { department, level } = req.query;
  let query = "SELECT * FROM lectures ORDER BY date, start";
  const params = [];

  if (department && level) {
    query = "SELECT * FROM lectures WHERE department=$1 AND level=$2 ORDER BY date, start";
    params.push(department, level);
  }

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

// Schedule a lecture
app.post("/api/lecturer/lectures", lecturerAuth, async (req, res) => {
  const { course, venue, date, start, end_time, department, level } = req.body;
  if (!course || !venue || !date || !start || !end_time || !department || !level) {
    return res.status(400).json({ error: "All fields are required" });
  }
1
  try {
    // Check for conflicts
    const conflict = await pool.query(
      `SELECT * FROM lectures WHERE venue=$1 AND date=$2 
       AND (($3 >= start AND $3 < end_time) OR ($4 > start AND $4 <= end_time))`,
      [venue, date, start, end_time]
    );

    if (conflict.rows.length > 0)
      return res.status(400).json({ error: "Venue already booked at that time" });

    const result = await pool.query(
      `INSERT INTO lectures (course, venue, date, start, end_time, department, level)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [course, venue, date, start, end_time, department, level]
    );

    res.json({ message: "Lecture scheduled", lecture: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB error" });
  }
});

// --------------------- Serve frontend (optional) ---------------------

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
