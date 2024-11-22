//Approach 1 of Connecting DataBase
// require ('dotenv').config({path : './env'});

/*
function connnectDB() {
  mongoose
    .connect("MONGODB_URL", {
      useNewUrlParser: true,
    })
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.log(err.message));
}
connnectDB();

function connnectDB() {
    if (!mongoose.connections[0].readyState) {
        return mongoose.connect("MONGODB_URL", {
            useNewUrlParser: true
            })
            .then(() => console.log("Connected to MongoDB"))
            .catch((err) => console.log(err.message
                ));
                }
                connnectDB();
}
*/
//Appraoch 2 "ifi"->method (used in Javascript);

/*
import { DB_NAME } from "./constants";
import express from "express";
import e from "express";
const app = express();

(async () => {
  try {
    await mongoose.connect("${process.env.MONGODB_URL}/${DB_NAME}");
    app.on("error", (error) => {
      console.log("Error : ", error);
      throw error;
    });

    app.listen(process.env.PORT, () => {
      console.log("Server is running on port ${process.env.PORT}");
    });
  } catch (error) {
    console.log("Error is ", error);
  }
})();
*/

//Approach 3  (create a different DB file in db folder and connect in index.js seperately )

import dotenv from "dotenv"
import connectDB from "./db/index.js";
dotenv.config({
    path: './.env'
})

connectDB()