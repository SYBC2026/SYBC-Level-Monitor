const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

let latestLevel = {
    station: "SYBC-001",
    level: 2.456,
    updated: new Date().toISOString()
};

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

        <p>Last Update</p>

        <h2>${new Date(latestLevel.updated).toLocaleString()}</h2>

    </body>
    </html>
    `);
});

app.listen(PORT, () => {
    console.log("SYBC Level Monitor running");
});
