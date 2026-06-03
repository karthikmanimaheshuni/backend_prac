import mongoose from "mongoose";
import dotenv from "dotenv";
import { DB_NAME } from "../constants.js";

dotenv.config();

const connectDB = async () => {
  try {
    console.log("Attempting to connect to MongoDB...");
    const connectionInstance = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: DB_NAME,
    });
    console.log(`Connected to MongoDB database: ${DB_NAME},
        Database Host: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

export default connectDB;