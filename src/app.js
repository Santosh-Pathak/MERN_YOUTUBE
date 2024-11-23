import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.uze(express.json({limit : "10kb"}));
app.use(express.urlencoded({extended : true}));
app.use(express.static("public"));
app.use(cookieParser());


// we use "app.use" when we work with middleswares or configuration setting
