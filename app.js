const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const dotEnd = require('dotenv');
dotEnd.config();

const app = express();
const port = process.env.PORT || 3800;
const host = '0.0.0.0';

// Custom routes
const indexRouter = require('./routes/index');
const adminRouter = require('./routes/admin');
const studentRouter = require('./routes/studentApi');


// CORS Configuration
app.use(cors({
  origin: process.env.CLIENT_URL || "*",
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));


// Middleware for logging
app.use((req, res, next) => {
  console.log(req.path, req.method);
  next();
});

// Body parsers
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Cookie Parser
app.use(cookieParser());

// Static files and logging
app.use(morgan("tiny"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static("frontend/dist"));


// View Engine
app.set("view engine", "ejs");

// Define Routes
app.use("/api/api/index", indexRouter);
app.use("/api/st", studentRouter);
app.use("/api", adminRouter);

// Test API Endpoint
app.post("/api-test", async (req, res) => {
  console.log(req.body);
  res.status(200).send("Request received successfully!");
});

// Fallback Route for SPA (Single Page Application)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend/dist", "index.html"));
});


// Connect to MongoDB
const uri = process.env.mongodb_URI || process.env.mongodb_url ;
mongoose.set('strictQuery', true);
mongoose.connect(uri)
  .then(() => {
    console.log(`Connected to MongoDB`);
<<<<<<< HEAD
    app.listen(port, () => {
=======
    app.listen(port,host, () => {
>>>>>>> bc49205dbf6d6a4ba4979b5616735256fc6b1584
      console.log(`AriTron CBT application listening on port ${port}. http://localhost:${port}`);
    });
  })
  .catch(err => console.log(err));