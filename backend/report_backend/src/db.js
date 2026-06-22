import pkg from "pg";
const { Pool } = pkg;
import "dotenv/config";

const pool = new Pool({
  user: process.env.DB_USER,      // همان n8n
  host: process.env.DB_HOST,      // همان 62.60.128.116
  database: process.env.DB_NAME,  // همان NewsDB
  password: process.env.DB_PASS,  // رمز عبور واقعی را در .env بنویسید
  port: process.env.DB_PORT,      // همان 5432
  ssl: false
});

pool.connect()
  .then((client) => {
    console.log("✅ Connected to PostgreSQL Successfully!");
    client.release();
  })
  .catch(err => {
    console.error("❌ DB connection error:", err.message);
    console.log("بررسی کنید: آیا پسورد در .env درست است؟");
  });

export default pool;