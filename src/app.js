import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";


const app = express();


app.use(cors(
    {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        credentials: true,
    }
));

app.use(express.json({limit: "10kb",}));
app.use(express.urlencoded({extended: true, limit: "10kb",}));  
app.use(express.static("public"));
app.use(cookieParser());


//////////Routes//////////
import userRoutes from "./routes/user.js";

app.use("/api/users", userRoutes);

//the route will be /api/users/register for the registerUser controller
//for login it will be /api/users/login and so on for other user related routes


export default app;