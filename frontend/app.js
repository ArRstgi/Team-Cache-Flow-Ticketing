/**
 * The frontend service is a dashboard that will show
 * what is happening in the system.
 */

import express from "express";
// import { createClient } from 'redis'
import service_data_object from './service_data.json' with { type: 'json' };

// get env variables
const SERVICE_INNER_PORT = Number(process.env.INNER_PORT || "3000");
const SERVICE_OUTER_PORT = Number(process.env.OUTER_PORT || "80");
// const redisUrl = process.env.REDIS_URL || "redis://redis:6379";


// parse service data
const serviceData = service_data_object//JSON.parse((process.env.SERVICE_DATA || "[]"))
    .filter(elem=>elem) //nonempty
    .map((dat,index)=>{
        return {
            ...dat,
            url_inner: `${dat.url}:${dat.port_inner}`,
            url_outer: `http://localhost:${dat.port_outer}`,
            index,
        };
    })

const app = express();
// const redisClient = createClient({ url: redisUrl });

// frontend page served from /public/index.html
app.use(express.static("public"));
app.use(express.json());

/// endpoints

app.get("/health",(req,res)=>{
    res.status(200).json({
        status: "healthy",
        service: "frontend",
    });
});

// get the data describing the services
app.get("/servicedata",(req,res)=>{
    res.json(serviceData);
});

//pipe request to backend, so it works on chrome
app.post("/fetch_backend",async (req,res)=>{
    const data = req.body;
    let response = await fetch(data.url,data.options);
    
    try {
        response = await response.json();
    }
    catch(_err){}

    res.json(response);
});


/// start up
// await redisClient.connect();

app.listen(SERVICE_INNER_PORT,()=>{
    let portstr = "";
    if (SERVICE_OUTER_PORT!=80) {
        portstr = `:${SERVICE_OUTER_PORT}`;
    }
    console.log(`Frontend accessible at http://localhost${portstr}/`);
});

