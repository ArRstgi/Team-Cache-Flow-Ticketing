/**
 * The frontend service is a dashboard that will show
 * what is happening in the system.
 */

import express from "express";
import { createClient } from 'redis'

// get env variables
const SERVICE_INNER_PORT = Number(process.env.INNER_PORT || "3000");
const SERVICE_OUTER_PORT = Number(process.env.OUTER_PORT || "80");
const redisUrl = process.env.REDIS_URL || "redis://redis:6379";


// get array of service urls
const serviceMap = {};
const serviceData = (process.env.SERVICE_URLS || "")
    .split(" ")
    .filter(str=>str) //nonempty
    .map((str,index)=>{
        const serv_str = str.split(","); //[ name, url, outer_port, inner_port ]
        const name = serv_str[0];
        const url = serv_str[1];
        const port_outer = serv_str[2];
        const port_inner = serv_str[3];
        return {
            name,
            url_inner: `${url}:${port_inner}`,
            port_inner,
            port_outer,
            health_url: `http://localhost:${port_outer}/health`,
            index,
        };
    });
serviceData.forEach(serv=>{
    serviceMap[serv.name] = serv;
});
// console.log(serviceMap);


const app = express();
const redisClient = createClient({ url: redisUrl });



/// endpoints

app.get("/health",(req,res)=>{
    res.status(200).json({
        status: "healthy",
        service: "frontend",
    });
});


// dashboard for monitoring what's going on
app.get("/",async (req,res)=>{

    let serv_string = "";
    const add_report = (success,label,order=0)=>{
        serv_string += `<div class="status_listing" style="order:${order};">
            <div>${success ? "✅" : "❌"}</div>
            <div class="label">${label}</div>
        </div>`;
    };

    let events_string = "";

    //get /health from all services
    const all_requests = serviceData.map(async (serv)=>{
        const servTitle = `${serv.name} <a href=${serv.health_url} target="_blank">/health</a>`;
        const healthURL = serv.url_inner + '/health';
        return new Promise(async (resolve)=>{
            await fetch(healthURL)
                .then(async (response)=>{
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data=>{
                    let status = data.status || "healthy"
                    let checks = data.checks;
                    if ((typeof checks) === "object") {
                        for(const [key,val] of Object.entries(checks)) {
                            let checkstatus = "???";
                            if ((typeof val) === "object") {
                                checkstatus = val.status || checkstatus;
                            }
                            status += `\n${key} status: ${checkstatus}`;
                        }
                    }
                    add_report(true,`${servTitle} ${status}`,serv.index);
                })
                .catch(err=>{
                    console.log(`service ${serv.name} fetch error:`,err);
                    add_report(false,`${servTitle} ${err}`,serv.index);
                })

            resolve();
        });
    });
    //get redis health
    all_requests.push(new Promise(async (resolve,reject)=>{
        try {
            const pong = await redisClient.ping();
            if (pong !== 'PONG') throw new Error(`Unexpected response: ${pong}`);
            //healthy
            add_report(true,"Redis healthy",-1);
        }
        catch(err) {
            //unhealthy
            add_report(false,`Redis ${err}`,-1);
        }
        resolve();
    }));

    //get events
    all_requests.push(new Promise(async (resolve,reject)=>{
        try {
            await fetch(serviceMap["Catalog"].url_inner+"/events")
                .then(response=>{
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data=>{
                    events_string += JSON.stringify(data,undefined,2);
                })
                // .catch(err=>{
                //     reject(err);
                // })
            resolve();
        }
        catch(err) {
            console.log("get /events error",err);
            events_string += "Unable to get /events";
            resolve();
        }
    }));

    //wait for all responses
    await Promise.all(all_requests);

    res.send(`
        <style>
            .status_list {
                white-space: break-spaces;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .status_listing {
                background: #0000001f;
                padding: 4px 6px;
                display: flex;
                align-items: center;
                gap: 6px;
            }
        </style>
        <div>
            <h2>Events Dashoard</h2>

            <h3>Service Health:</h3>
            <div class="status_list">${serv_string}</div>

            <h3>Events:</h3>
            <div class="status_list">${events_string}</div>
        </div>
    `);
});


/// start up

await redisClient.connect();

app.listen(SERVICE_INNER_PORT,()=>{
    let portstr = "";
    if (SERVICE_OUTER_PORT!=80) {
        portstr = `:${SERVICE_OUTER_PORT}`;
    }
    console.log(`Frontend accessible at http://localhost${portstr}/`);
});

