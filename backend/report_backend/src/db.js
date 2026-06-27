import pkg from "pg";
const { Pool } = pkg;
import "dotenv/config";

const poolConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: Number(process.env.DB_PORT) || 5432,
  ssl: false,
  max: Number(process.env.DB_POOL_MAX) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
};

function isTransientDbError(err) {
  if (!err) return false;
  const msg = String(err.message || "").toLowerCase();
  return (
    msg.includes("connection terminated")
    || msg.includes("connection refused")
    || msg.includes("econnreset")
    || err.code === "ECONNRESET"
    || err.code === "ECONNREFUSED"
    || err.code === "57P01"
    || err.code === "53300"
  );
}

const innerPool = new Pool(poolConfig);

// جلوگیری از crash کل process هنگام قطع اتصال idle در pool (الزام node-pg)
innerPool.on("error", (err) => {
  console.error("[db] idle client error:", err?.message);
});

async function queryWithRetry(text, params) {
  try {
    return await innerPool.query(text, params);
  } catch (err) {
    if (!isTransientDbError(err)) throw err;
    return innerPool.query(text, params);
  }
}

const pool = {
  query: queryWithRetry,
  connect: (...args) => innerPool.connect(...args),
  end: (...args) => innerPool.end(...args),
  on: (...args) => innerPool.on(...args),
};

innerPool.connect()
  .then((client) => {
    console.log("✅ Connected to PostgreSQL Successfully!");
    client.release();
  })
  .catch((err) => {
    console.error("❌ DB connection error:", err.message);
    console.log("بررسی کنید: آیا پسورد در .env درست است؟");
  });

export default pool;
