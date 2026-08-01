const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

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

        <div class="level">${latestLevel.level.toFixed(3)} m</div>

        <p>Status: ${latestLevel.status}</p>

        <p>Firmware: ${latestLevel.firmware}</p>

        <h2>${new Date(latestLevel.updated).toLocaleString()}</h2>

    </body>
    </html>
    `);
});

// ESP32 uploads here
app.post("/api/upload", (req, res) => {

    latestLevel = {
        station: req.body.station || "Unknown",
        level: Number(req.body.level),
        status: req.body.status || "Normal",
        firmware: req.body.firmware || "",
        updated: new Date().toISOString()
    };

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
