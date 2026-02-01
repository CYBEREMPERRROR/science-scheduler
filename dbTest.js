const pool = require("./index"); // or wherever your Pool is exported

async function testDB() {
  try {
    const res = await pool.query("SELECT NOW()"); // simple query to check connection
    console.log("✅ Database connected successfully! Server time:", res.rows[0].now);
  } catch (err) {
    console.error("❌ Database connection failed:", err);
  } finally {
    pool.end(); // close the connection
  }
}

testDB();
