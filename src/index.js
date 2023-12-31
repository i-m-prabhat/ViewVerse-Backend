import { configDotenv } from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
configDotenv();

connectDB().then(() =>
{
    app.on("error", (error) =>
    {
        console.error("ERROR Connecting to Database", error);
        throw error
    });

    app.listen(process.env.PORT || 8000, () =>
    {
        console.log(`Server running on port ${process.env.PORT || "8000"}`);
    })
}).catch((err) =>
{
    console.log("Database Connection failed!", err);
})














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