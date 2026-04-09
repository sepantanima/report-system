import "dotenv/config";
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import reportsRoutes from "./routes/reports.js";



const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Report API running" });
});

app.use("/api/users", usersRoutes);
app.use("/api/reports", reportsRoutes);


const PORT = 3000;

app.listen(PORT, () => {
  console.log("server running on port", PORT);
});

console.log(">>> TEST DEPLOY WORKING <<<");
