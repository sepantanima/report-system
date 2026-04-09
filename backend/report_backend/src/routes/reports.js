import express from "express";
import pool from "../db.js";
import auth from "../middleware/auth.js";

const router = express.Router();

/*
POST /api/reports
ثبت گزارش روزانه
*/
router.post("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { content } = req.body;

    const today = new Date().toISOString().slice(0,10);

    const existing = await pool.query(
      "SELECT id FROM reports WHERE user_id=$1 AND report_date=$2",
      [userId, today]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: "Report already submitted today"
      });
    }

    const result = await pool.query(
      `INSERT INTO reports (user_id, report_date, content)
       VALUES ($1,$2,$3)
       RETURNING *`,
      [userId, today, content]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({error:"Server error"});
  }
});


/*
GET /api/reports/my
گزارش‌های خود کاربر
*/
router.get("/my", auth, async (req,res)=>{
  try {

    const result = await pool.query(
      `SELECT * FROM reports
       WHERE user_id=$1
       ORDER BY report_date DESC`,
      [req.user.id]
    );

    res.json(result.rows);

  } catch(err){
    console.error(err);
    res.status(500).json({error:"Server error"});
  }
});


/*
GET /api/reports/team
مشاهده گزارش تیم (با فیلتر تاریخ)
*/
router.get("/team", auth, async (req,res)=>{
  try {

    if(req.user.role !== "admin"){
      return res.status(403).json({error:"Access denied"});
    }

    const { from, to } = req.query;

    let query = `
      SELECT reports.*, users.name
      FROM reports
      JOIN users ON users.id = reports.user_id
    `;

    let params = [];

    if(from && to){
      query += ` WHERE report_date BETWEEN $1 AND $2`;
      params = [from, to];
    }

    query += ` ORDER BY report_date DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows);

  } catch(err){
    console.error(err);
    res.status(500).json({error:"Server error"});
  }
});
/*
GET /api/reports/today
گزارش‌های امروز تیم
*/
router.get("/today", auth, async (req,res)=>{
  try{

    if(req.user.role !== "admin"){
      return res.status(403).json({error:"Access denied"});
    }

    const today = new Date().toISOString().slice(0,10);

    const result = await pool.query(
      `SELECT reports.*, users.name
       FROM reports
       JOIN users ON users.id = reports.user_id
       WHERE report_date = $1
       ORDER BY users.name`,
      [today]
    );

    res.json(result.rows);

  }catch(err){
    console.error(err);
    res.status(500).json({error:"Server error"});
  }
});

/*
GET /api/reports/missing
کاربرانی که امروز گزارش نداده‌اند
*/
router.get("/missing", auth, async (req,res)=>{
  try{

    if(req.user.role !== "admin"){
      return res.status(403).json({error:"Access denied"});
    }

    const today = new Date().toISOString().slice(0,10);

    const result = await pool.query(
      `
      SELECT users.id, users.name, users.email
      FROM users
      WHERE users.active = true
      AND users.id NOT IN (
        SELECT user_id
        FROM reports
        WHERE report_date = $1
      )
      ORDER BY users.name
      `,
      [today]
    );

    res.json(result.rows);

  }catch(err){
    console.error(err);
    res.status(500).json({error:"Server error"});
  }
});

/*
GET /api/reports/summary
خلاصه وضعیت گزارش امروز
*/
router.get("/summary", auth, async (req,res)=>{
  try{

    if(req.user.role !== "admin"){
      return res.status(403).json({error:"Access denied"});
    }

    const today = new Date().toISOString().slice(0,10);

    const totalUsers = await pool.query(
      `SELECT COUNT(*) FROM users WHERE active = true`
    );

    const submitted = await pool.query(
      `SELECT COUNT(DISTINCT user_id)
       FROM reports
       WHERE report_date = $1`,
      [today]
    );

    const total = parseInt(totalUsers.rows[0].count);
    const done = parseInt(submitted.rows[0].count);
    const missing = total - done;

    res.json({
      date: today,
      total_users: total,
      submitted_reports: done,
      missing_reports: missing
    });

  }catch(err){
    console.error(err);
    res.status(500).json({error:"Server error"});
  }
});

/*
GET /api/reports/dashboard
داده‌های کامل داشبورد مدیر
*/
router.get("/dashboard", auth, async (req,res)=>{
  try{

    if(req.user.role !== "admin"){
      return res.status(403).json({error:"Access denied"});
    }

    const today = new Date().toISOString().slice(0,10);

    // total users
    const totalUsers = await pool.query(
      `SELECT COUNT(*) FROM users WHERE active = true`
    );

    // reports today
    const reportsToday = await pool.query(
      `SELECT reports.*, users.name
       FROM reports
       JOIN users ON users.id = reports.user_id
       WHERE report_date = $1
       ORDER BY users.name`,
      [today]
    );

    // missing users
    const missingUsers = await pool.query(
      `
      SELECT users.id, users.name, users.email
      FROM users
      WHERE active = true
      AND id NOT IN (
        SELECT user_id FROM reports WHERE report_date = $1
      )
      ORDER BY users.name
      `,
      [today]
    );

    const total = parseInt(totalUsers.rows[0].count);
    const submitted = reportsToday.rows.length;
    const missing = total - submitted;

    res.json({
      date: today,
      summary:{
        total_users: total,
        submitted_reports: submitted,
        missing_reports: missing
      },
      reports_today: reportsToday.rows,
      missing_users: missingUsers.rows
    });

  }catch(err){
    console.error(err);
    res.status(500).json({error:"Server error"});
  }
});


/*
GET /api/reports/dashboard
داده‌های کامل داشبورد مدیر
*/
router.get("/dashboard", auth, async (req,res)=>{
  try{

    if(req.user.role !== "admin"){
      return res.status(403).json({error:"Access denied"});
    }

    const today = new Date().toISOString().slice(0,10);

    // total active users
    const totalUsers = await pool.query(
      `SELECT COUNT(*) FROM users WHERE active = true`
    );

    // reports today
    const reportsToday = await pool.query(
      `SELECT reports.*, users.name
       FROM reports
       JOIN users ON users.id = reports.user_id
       WHERE report_date = $1
       ORDER BY users.name`,
      [today]
    );

    // missing users
    const missingUsers = await pool.query(
      `
      SELECT users.id, users.name, users.email
      FROM users
      WHERE active = true
      AND id NOT IN (
        SELECT user_id FROM reports WHERE report_date = $1
      )
      ORDER BY users.name
      `,
      [today]
    );

    // last 7 days activity
    const weeklyStats = await pool.query(
      `
      SELECT report_date, COUNT(*) as reports
      FROM reports
      WHERE report_date >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY report_date
      ORDER BY report_date
      `
    );

    // most active users
    const topUsers = await pool.query(
      `
      SELECT users.name, COUNT(reports.id) as reports_count
      FROM reports
      JOIN users ON users.id = reports.user_id
      GROUP BY users.name
      ORDER BY reports_count DESC
      LIMIT 5
      `
    );

    const total = parseInt(totalUsers.rows[0].count);
    const submitted = reportsToday.rows.length;
    const missing = total - submitted;

    res.json({
      date: today,
      summary:{
        total_users: total,
        submitted_today: submitted,
        missing_today: missing
      },
      reports_today: reportsToday.rows,
      missing_users: missingUsers.rows,
      weekly_activity: weeklyStats.rows,
      top_users: topUsers.rows
    });

  }catch(err){
    console.error(err);
    res.status(500).json({error:"Server error"});
  }
});

export default router;
