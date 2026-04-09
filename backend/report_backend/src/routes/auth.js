import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db.js";
import auth from "../middleware/auth.js";

const router = Router();


// register
router.post("/register", async (req, res) => {

  const { name, email, password } = req.body;

  try {

    const hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (name,email,password)
       VALUES ($1,$2,$3)
       RETURNING id,name,email`,
      [name, email, hash]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "register failed" });
  }

});


router.post("/login", async (req, res) => {

  const { username, password } = req.body;

  try {

    
    console.log("USERNAME SENT:", username);

const result = await db.query(
  "SELECT id, username FROM users WHERE username=$1",
  [username]
);

console.log("DB RESULT:", result.rows);


    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: "user not found" });
    }

    const user = result.rows[0];

    if (!user.active) {
      return res.status(403).json({ error: "user inactive" });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(400).json({ error: "wrong password" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "login failed" });
  }

});



// current user
router.get("/me", auth, async (req, res) => {

  const result = await db.query(
    `SELECT id,name,email,role,active
     FROM users
     WHERE id=$1`,
    [req.user.id]
  );

  res.json(result.rows[0]);

});


// deactivate user
router.patch("/users/:id/deactivate", async (req, res) => {

  await db.query(
    "UPDATE users SET active=false WHERE id=$1",
    [req.params.id]
  );

  res.json({ message: "user deactivated" });

});


export default router;
