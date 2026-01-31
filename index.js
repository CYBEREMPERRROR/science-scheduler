const express = require("express");
const fs = require("fs");
const path = require("path");

const venuesFile = path.join(__dirname, "venues.json");
const scheduleFile = path.join(__dirname, "schedule.json");

// Load venues/schedule from file
let venues = JSON.parse(fs.readFileSync(venuesFile, "utf-8"));
let schedule = JSON.parse(fs.readFileSync(scheduleFile, "utf-8"));

// Helpers to save
function saveVenues() {
  fs.writeFileSync(venuesFile, JSON.stringify(venues, null, 2));
}
function saveSchedule() {
  fs.writeFileSync(scheduleFile, JSON.stringify(schedule, null, 2));
}
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
app.post("/venues", (req, res) => {
  const { name, capacity } = req.body;
  if (!name || !capacity) return res.status(400).json({ error: "Name and capacity required" });

  venues.push({ name, capacity });
  saveVenues();
  res.json({ message: "Venue added", venue: { name, capacity } });
});

// Get all venues
app.get("/venues", (req, res) => {
  res.json(venues);
});

// ----- SCHEDULE ROUTES -----

// Create lecture/exam schedule
app.post("/schedule", (req, res) => {
  const { course, venue, date, start, end, department, level } = req.body;
  if (!course || !venue || !date || !start || !end || !department || !level) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Prevent double booking
  const conflict = schedule.find(
    s => s.venue === venue && s.date === date && ((start >= s.start && start < s.end) || (end > s.start && end <= s.end))
  );
  if (conflict) return res.status(400).json({ error: "Venue already booked at that time" });

  const newLecture = { course, venue, date, start, end, department, level };
  schedule.push(newLecture);
  saveSchedule();

  res.json({ message: "Lecture scheduled", lecture: newLecture });
});

// Get all schedules
app.get("/schedule", (req, res) => {
  res.json(schedules);
});

// Get schedules for a specific department and level (student view)
app.get("/schedule/:department/:level", (req, res) => {
  const { department, level } = req.params;
  const filtered = schedules.filter(s =>
    s.level === level && s.departments.includes(department)
  );
  res.json(filtered);
});

// ---------- START SERVER ----------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

