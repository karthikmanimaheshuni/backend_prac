console.log("Index.js started");
import connectDB from "./db/index.js";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

connectDB()
.then(()=> {
  console.log("Connected to the database successfully.");
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
} )
.catch((error) => {
  console.error("Failed to connect to the database:", error);
  process.exit(1);
});


app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});