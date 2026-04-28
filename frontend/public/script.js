

const serviceData = await fetch("/servicedata")
    .then(response=>response.json());

const service_list = document.getElementById("service_list");
const response_output_iframe = document.getElementById("response_output_iframe");
const response_output_div = document.getElementById("response_output_div");
const elem_response_loading = document.getElementById("response_loading");
response_output_iframe.addEventListener("load",()=>{
    response_output_iframe.style.display = "";
    elem_response_loading.style.display = "none";
});

async function fetchBackend(url,options) {
    //gets the job done
    return await fetch("/fetch_backend",{
        method: "POST",
        body: JSON.stringify({
            url,
            options,
        }),
        headers: {
            'Content-Type': 'application/json',
        },
    });
}

serviceData.forEach(async (serv) => {
    //immediately create listing div
    const listing = document.createElement("div");
    listing.classList.add("service_listing","flex-horiz");
    listing.style.setProperty("order",serv.index);
    service_list.appendChild(listing);

    //status icon
    const statusIcon = document.createElement("div");
    statusIcon.innerHTML = `<div class="icon_loading">🔁</div>`;
    listing.appendChild(statusIcon);

    //status label
    const statusLabel = document.createElement("div");
    statusLabel.classList.add("label","flex-vert");
    statusLabel.innerHTML = `<h3>${serv.name}</h3>`;
    listing.appendChild(statusLabel);
    
    //check health
    fetchBackend(`${serv.url_inner}/health`)
        .then(async (response)=>{
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data=>{
            //health status
            statusLabel.innerHTML += `Status: ${data.status || "healthy"}`;

            //add other checks
            let checks = data.checks;
            if ((typeof checks) === "object") {
                for(const [key,val] of Object.entries(checks)) {
                    let checkstatus = "???";
                    if ((typeof val) === "object") {
                        checkstatus = val.status || checkstatus;
                    }
                    const checkName = key.charAt(0).toUpperCase() + key.slice(1);
                    statusLabel.innerHTML += `\n${checkName}: ${checkstatus}`;
                }
            }

            //add links to endpoints
            if (serv.endpoints) {
                statusLabel.innerHTML += `\n<b>Endpoints:</b>`;
                //forms for each endpoint
                serv.endpoints.forEach(endpoint_obj => {
                    const method = (endpoint_obj.method ?? "GET").toUpperCase();
                    const pathDataArr = endpoint_obj.path
                        .split("/")
                        .filter(_elem=>_elem) //nonempty
                        .map(str=>{
                            let is_variable = str[0]==":";
                            let namestr = str;
                            let elemstr = str;
                            if (is_variable) {
                                namestr = str.slice(1);
                                elemstr = `${namestr}:<input name="${namestr}" type="text" autocomplete="off"></input>`;
                            }
                            return {
                                is_variable,
                                name: namestr,
                                element: elemstr,
                            };
                        });
                    
                    const form = document.createElement("form");
                    form.classList.add("endpoint_form");
                    //submit button
                    form.innerHTML += `<button type="submit">${method}</button> `;
                    //path string
                    form.innerHTML += pathDataArr.map(path=>path.element).join("/");
                    //body
                    if (method!="GET") {
                        const body_str = JSON.stringify(endpoint_obj.body ?? "{}",undefined,2);
                        form.innerHTML += `\nBody:<textarea name="body_textarea">${body_str}</textarea>`;
                    }

                    form.addEventListener("submit",async (event)=>{
                        event.preventDefault();
                        const formData = new FormData(event.target);
                        const formObj = Object.fromEntries(formData.entries());
                        
                        //forms into path string
                        const reqPath = pathDataArr.map(pathobj=>{
                            if (pathobj.is_variable) {
                                return formObj[pathobj.name]; //get input value
                            }
                            else {
                                return pathobj.name;
                            }
                        }).join("/");

                        //clear previous output
                        response_output_div.innerHTML = "";
                        response_output_iframe.style.display = "none";
                        response_output_div.style.display = "none";
                        //show loading
                        elem_response_loading.style.display = "";

                        //navigate iframe to page
                        if (method=="GET") {
                            response_output_iframe.src = `${serv.url_outer}/${reqPath}`;
                        }
                        //get json response
                        else {
                            const req_obj = {
                                method,
                                body: formObj.body_textarea,
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                            };
                            await fetchBackend(`${serv.url_inner}/${reqPath}`,req_obj)
                                .then(async (response)=>{
                                    // if (!response.ok) {
                                    //     throw new Error('Network response was not ok');
                                    // }
                                    return response.json();
                                })
                                .then(data=>{
                                    response_output_div.innerHTML = JSON.stringify(data,undefined,2);
                                })
                                .catch(err=>{
                                    response_output_div.innerHTML = err;
                                });
                            response_output_div.style.display = "";
                            elem_response_loading.style.display = "none";
                        }
                    })

                    statusLabel.appendChild(form);
                });
            }

            statusIcon.innerText = "✅";
        })
        .catch(err=>{
            console.log(`service ${serv.name} fetch error:`,err);
            statusLabel.innerText += err;
            statusIcon.innerText = "❌";
        })
});

//#region theme
document.addEventListener("keydown",(ev)=>{
    if (ev.target==document.body && ev.key=="f") {
        const state = !document.body.classList.contains("theme-fancy");
        if (state) {
            const date = new Date();
            date.setTime(date.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days from now
            document.cookie = "theme=fancy; path=/; expires="+date.toUTCString();
        }
        else {
            document.cookie = "theme=; max-age=0; path=/;";
        }
        check_theme();
    }
});
async function check_theme() {
    const theme = (await cookieStore.get('theme'))?.value;
    if (theme==="fancy") {
        document.body.classList.add("theme-fancy");
    }
    else {
        document.body.classList.remove("theme-fancy");
    }
}
check_theme();
//#endregion

