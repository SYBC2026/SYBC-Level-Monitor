const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

let levelHistory = [];
let latestLevel = {
    station: "SYBC-001",
    level: 2.456,
    status: "Normal",
    firmware: "1.1.3",
    updated: new Date().toISOString()
};

// Home Page
app.get("/", (req, res) => {
    res.send(`
    <html>
    <head>
        <title>SYBC Level Monitor</title>
        <style>
            body{
                font-family:Arial;
                text-align:center;
                background:#0b4f6c;
                color:white;
                margin-top:60px;
            }
            h1{
                font-size:48px;
            }
            .level{
                font-size:72px;
                font-weight:bold;
            }
        </style>
    </head>

    <body>

        <h1>SYBC Level Monitor</h1>

        <div class="level" id="level">Loading...</div>

        <h3>Status</h3>
<div id="status">Loading...</div>

<h3>Station</h3>
<div id="station">Loading...</div>

<h3>Firmware</h3>
<div id="firmware">Loading...</div>

        <p>Status: ${latestLevel.status}</p>

        <p>Firmware: ${latestLevel.firmware}</p>

        <h2 id="updated">Loading...</h2>
<h3>Next Upload</h3>
<div id="nextUpload">Calculating...</div>
        
<script>
async function updateLevel() {

    try {

        const response = await fetch('/api/latest');
        const data = await response.json();

        document.getElementById('level').innerHTML =
            data.level.toFixed(3) + " m";
            
document.getElementById('updated').innerHTML =
    new Date(data.updated).toLocaleString();
nextUploadTime = new Date(data.updated).getTime() + 300000;
    

const statusBox = document.getElementById('status');

statusBox.innerHTML = data.status;

if (data.status === "Normal") {

    statusBox.style.color = "#00cc44";

}
else if (data.status === "Warning") {

    statusBox.style.color = "orange";

}
else if (data.status === "Alarm") {

    statusBox.style.color = "red";

}
else {

    statusBox.style.color = "grey";

}
document.getElementById('station').innerHTML = data.station;
document.getElementById('firmware').innerHTML = data.firmware;
    
    }
    catch (err) {
        console.log(err);
    }

}

updateLevel();

setInterval(updateLevel, 10000);
</script>
    </body>
    </html>
    `);
});

let nextUploadTime = 0;

function updateCountdown() {

    const remaining = Math.max(0, nextUploadTime - Date.now());

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    document.getElementById('nextUpload').innerHTML =
        minutes + ":" + seconds.toString().padStart(2, "0");
}

setInterval(updateCountdown, 1000);

// ESP32 uploads here
app.post("/api/upload", (req, res) => {
let levelHistory = [];
    latestLevel = {
        station: req.body.station || "Unknown",
        level: Number(req.body.level),
        status: req.body.status || "Normal",
        firmware: req.body.firmware || "",
        updated: new Date().toISOString()
    };
levelHistory.push(latestLevel);
    console.log("Upload received:", latestLevel);

    res.json({
        success: true
    });

});

// Latest data
app.get("/api/latest", (req, res) => {

    res.json(latestLevel);

});

app.listen(PORT, () => {

    console.log("SYBC Level Monitor running");

});
