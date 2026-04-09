/**
 * The frontend service is a dashboard that will show
 * what is happening in the system.
 */

import express from "express";



const port = Number(process.env.PORT || "3000");



const app = express();




/// endpoints

app.get("/health",(req,res)=>{
    res.status(200).json({
        status: "healthy",
    });
});


// dashboard for monitoring what's going on
app.get("/",(req,res)=>{

    res.send(`
        <div>
            <h2>Events Dashoard</h2>
        </div>
    `);
});


/// start up

app.listen(port,()=>{
    console.log(`Frontend running on port ${port}!`);
});

