import { configDotenv } from "dotenv";
import connectDB from "./db/index.js";
configDotenv();

connectDB();














/*
import { configDotenv } from "dotenv";
configDotenv();
import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";
import express from "express";
const app = express();

(async () =>
{
    try
    {
        await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
        app.on("error", (error) =>
        {
            console.error("ERROR Connecting to Database", error);
            throw error
        })

        app.listen(process.env.PORT, () =>
        {

            console.log(`Server is running on port ${process.env.PORT}`)
        })

    } catch (error)
    {
        console.error("ERROR Connecting to Database", error);
        throw error
    }
})()

*/