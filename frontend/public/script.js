

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
function isValidHTML(str) {
    if (!str.includes("<")) {
        return false;
    }
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(str, "text/html");
        const errorNode = doc.querySelector("parsererror");
        return !errorNode;
    }
    catch(e) {
        return false;
    }
}
function set_response_output_text(str,outerURL=undefined) {

    //empty
    if (str==="") {
        response_output_div.style.display = "none";
        response_output_iframe.style.display = "none";
        return;
    }

    //navigate iframe to page if it's html
    if (!!outerURL && isValidHTML(str)) {
        response_output_div.style.display = "none";
        response_output_iframe.style.display = "";
        response_output_iframe.removeAttribute("srcdoc");
        response_output_iframe.src = outerURL;
        return;
    }

    let is_json = false;
    if ((typeof str) === "string") {
        try {
            str = JSON.parse(str);
        }
        catch(e){}
    }
    if ((typeof str) === "object") {
        try {
            str = JSON.stringify(str,undefined,2);
            is_json = true;
        }
        catch(e){}
    }

    //formatted json
    if (is_json) {
        response_output_div.innerHTML = str;
        response_output_div.style.display = "";
        response_output_iframe.style.display = "none";
    }
    //navigate iframe to string (may be html)
    else {
        response_output_iframe.srcdoc = str;
        response_output_div.style.display = "none";
        response_output_iframe.style.display = "";
    }
    elem_response_loading.style.display = "none";
}

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

function check_services() {
    serviceData.forEach(async (serv) => {
        //immediately create listing div
        const listing = document.createElement("div");
        listing.classList.add("service_listing","flex-horiz");
        listing.style.setProperty("order",serv.index);
        service_list.appendChild(listing);

        //status icon
        const statusIcon = document.createElement("div");
        statusIcon.classList.add("loading_inline");
        const loadingID = `loading_${serv.index}`;
        statusIcon.id = loadingID;
        statusIcon.innerHTML = `<div class="icon_loading">🔄</div>`;

        //status label
        const statusLabel = document.createElement("div");
        statusLabel.classList.add("label","flex-vert");
        statusLabel.innerHTML = `<h3>${statusIcon.outerHTML}<span> ${serv.name}</span></h3>`;
        listing.appendChild(statusLabel);
        const setLoadingIcon = (str)=>{
            const _elem = document.getElementById(loadingID);
            if (_elem) {
                _elem.innerHTML = str;
            }
        };
        
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
                    let details = document.createElement("details");
                    details.innerHTML += `\n<summary><b>Endpoints:</b></summary>`;
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
                                    elemstr = `${namestr}:<input name="${namestr}"`
                                        + ` type="text" autocomplete="off" size="4" required></input>`;
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
                        form.innerHTML += "/"+pathDataArr.map(path=>path.element).join("/");

                        //query params
                        if ((typeof endpoint_obj.query) === "object") {
                            let query_str = JSON.stringify(endpoint_obj.query,undefined,2);
                            form.innerHTML += `\nQuery params:<div class="flex-vert">`
                                + `<textarea name="query_textarea" spellcheck="false">${query_str}</textarea></div>`;
                        }

                        //body
                        if (method!="GET") {
                            let body_str = ""; //can be string or object
                            if ((typeof endpoint_obj.body) === "object") {
                                body_str = JSON.stringify(endpoint_obj.body ?? "{}",undefined,2);
                            }
                            form.innerHTML += `\nBody:<div class="flex-vert">`
                                + `<textarea name="body_textarea" spellcheck="false">${body_str}</textarea></div>`;
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
                            const outerURL = method=="GET" ? `${serv.url_outer}/${reqPath}` : null;

                            //make request url
                            let reqURL = `${serv.url_inner}/${reqPath}`;
                            //query params
                            if (formObj.query_textarea) {
                                const queryObj = JSON.parse(formObj.query_textarea);
                                reqURL += "?"+(new URLSearchParams(queryObj).toString());
                            }

                            //clear previous output
                            set_response_output_text("");
                            //show loading
                            elem_response_loading.style.display = "";

                            const req_obj = {
                                method
                            };
                            if (method!="GET") {
                                req_obj.body = formObj.body_textarea;
                                req_obj.headers = {
                                    'Content-Type': 'application/json',
                                };
                            }
                            await fetchBackend(reqURL,req_obj)
                                .then(async (response)=>{
                                    return response.text();
                                })
                                .then(data=>{
                                    set_response_output_text(data,outerURL);
                                })
                                .catch(err=>{
                                    console.log(`Endpoint fetch error:`,err);
                                    set_response_output_text(err,outerURL);
                                });
                        })

                        details.appendChild(form);
                        statusLabel.appendChild(details);
                    });
                }

                setLoadingIcon("✅")
            })
            .catch(err=>{
                console.log(`service ${serv.name} fetch error:`,err);
                statusLabel.innerText += err;
                setLoadingIcon("❌");
            })
    });
}

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
//#endregion

//call init once document is loaded
function init() {
    check_theme();
    check_services();
}
if (document.readyState=="complete") {
    init();
}
else {
    document.body.addEventListener("load",init);
}


