// SYBC Level Monitor - history enabled
const express = require('express');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

let levelHistory = [];

// Safe temporary value while Neon is being checked.
// This will be replaced by the most recent real reading.
let latestLevel = {
    station: "SYBC-001",
    level: 0.000,
    status: "Starting",
    firmware: "",
    updated: "1970-01-01T00:00:00.000Z"
};

async function initializeDatabase() {

    try {

        // Check Neon connection
        await pool.query('SELECT NOW()');
        console.log('Neon database connected');

        // Make sure the history table exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS level_history (
                id BIGSERIAL PRIMARY KEY,
                station TEXT NOT NULL,
                level DOUBLE PRECISION NOT NULL,
                status TEXT,
                firmware TEXT,
                updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

        console.log('level_history table ready');

        // Load the most recent real reading from Neon
        const result = await pool.query(`
            SELECT
                station,
                level,
                status,
                firmware,
                updated
            FROM level_history
            ORDER BY updated DESC
            LIMIT 1
        `);

        if (result.rows.length > 0) {

            const row = result.rows[0];

            latestLevel = {
                station: row.station,
                level: Number(row.level),
                status: row.status || "Normal",
                firmware: row.firmware || "",
                updated: new Date(row.updated).toISOString()
            };

            console.log(
                'Latest reading loaded from Neon:',
                latestLevel
            );

        }
        else {

            console.log('No historical readings found in Neon');

        }

    }
    catch (err) {

        console.log(
            'Database initialization failed:',
            err.message
        );

    }
}

initializeDatabase();
    

// Home Page
app.get("/", (req, res) => {
    res.send(`
   <html>
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title>SYBC Level Monitor</title>

    <style>
        :root {
            --accent: #ff8c00;
            --bg: #0b4f6c;
            --card-bg: #0e5f80;
            --text-light: #ffffff;
            --text-muted: #d0e6f0;
        }

        * {
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            background: var(--bg);
            color: var(--text-light);
            margin: 0;
            padding: 20px;
        }

        h1 {
            text-align: center;
            font-size: 40px;
            margin: 10px 0 25px;
            color: var(--accent);
        }

        .dashboard {
            max-width: 1100px;
            margin: auto;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 20px;
        }

        .card {
            background: var(--card-bg);
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            text-align: center;
        }

        .card h2 {
            margin: 0 0 10px;
            font-size: 22px;
            color: var(--accent);
        }

        .value {
            font-size: 48px;
            font-weight: bold;
            margin-top: 10px;
        }

        .status {
            font-size: 28px;
            font-weight: bold;
            margin-top: 10px;
        }

        .detail {
            font-size: 20px;
            color: var(--text-light);
            margin-top: 10px;
        }

        .chart-card {
            grid-column: 1 / -1;
        }

        #chart-container {
            position: relative;
            width: 100%;
            height: 400px;
        }

        #levelChart {
            width: 100% !important;
            height: 100% !important;
        }

        .fullscreen-chart #chart-container {
            width: 100vw;
            height: 100vh;
        }

        @media (max-width: 600px) {
            body {
                padding: 12px;
            }

            h1 {
                font-size: 30px;
            }

            .dashboard {
                grid-template-columns: 1fr;
                gap: 12px;
            }

            .value {
                font-size: 42px;
            }

            .status {
                font-size: 24px;
            }

            .detail {
                font-size: 18px;
            }

            #chart-container {
                height: 320px;
            }
        }
    </style>

    <link rel="icon" href="data:,">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>

<body>

<h1>SYBC Level Monitor</h1>

<div class="dashboard">

    <div class="card">
        <h2>Current Level</h2>
        <div class="value" id="level">Loading...</div>
    </div>

    <div class="card">
        <h2>Status</h2>
        <div class="status" id="status">Loading...</div>
    </div>

    <div class="card">
        <h2>Station</h2>
        <div class="detail" id="station">Loading...</div>
    </div>

    <div class="card">
        <h2>Firmware</h2>
        <div class="detail" id="firmware">Loading...</div>
    </div>

    <div class="card">
        <h2>Last Updated</h2>
        <div class="detail" id="updated">Loading...</div>
    </div>

    <div class="card">
        <h2>Next Upload</h2>
        <div class="detail" id="nextUpload">Calculating...</div>
    </div>

    <div class="card chart-card">
        <h2>Last 7 Days</h2>

        <div id="chart-container">
            <canvas id="levelChart"></canvas>
        </div>
    </div>

</div>

<script>

let nextUploadTime = 0;
let levelChart = null;


/* ---------------- LIVE DATA ---------------- */

async function fetchLatest() {

    const response = await fetch('/api/latest');

    if (!response.ok) {
        throw new Error('Latest data request failed');
    }

    return await response.json();
}


async function fetchHistory() {

    const response = await fetch('/api/history');

    if (!response.ok) {
        throw new Error('History request failed');
    }

    return await response.json();
}


/* ---------------- CURRENT LEVEL ---------------- */

async function updateLevel() {

    try {

        const data = await fetchLatest();

        const level = Number(data.level);

        document.getElementById('level').innerHTML =
            level.toFixed(3) + ' m';

        const updatedTime =
            new Date(data.updated).getTime();

        document.getElementById('updated').innerHTML =
            new Date(data.updated).toLocaleString();

        nextUploadTime =
            updatedTime + 300000;

        document.getElementById('station').innerHTML =
            data.station || 'Unknown';

        document.getElementById('firmware').innerHTML =
            data.firmware || 'Unknown';

        const statusBox =
            document.getElementById('status');

        const dataAge =
            Date.now() - updatedTime;

        const stale =
            dataAge > (15 * 60 * 1000);

        if (stale) {

            statusBox.innerHTML =
                'STALE - No recent data';

            statusBox.style.color =
                'orange';

        }
        else if (data.status === 'Normal') {

            statusBox.innerHTML = 'Normal';
            statusBox.style.color = '#00ff66';

        }
        else if (data.status === 'Warning') {

            statusBox.innerHTML = 'Warning';
            statusBox.style.color = '#ffb000';

        }
        else if (data.status === 'Alarm') {

            statusBox.innerHTML = 'ALARM';
            statusBox.style.color = '#ff4040';

        }
        else {

            statusBox.innerHTML =
                data.status || 'Unknown';

            statusBox.style.color =
                '#d0e6f0';

        }

    }
    catch (err) {

        console.log(
            'Level update error:',
            err
        );

    }
}


/* ---------------- COUNTDOWN ---------------- */

function updateCountdown() {

    if (!nextUploadTime) {

        document.getElementById('nextUpload').innerHTML =
            'Waiting...';

        return;
    }

    const remaining =
        Math.max(
            0,
            nextUploadTime - Date.now()
        );

    const minutes =
        Math.floor(
            remaining / 60000
        );

    const seconds =
        Math.floor(
            (remaining % 60000) / 1000
        );

    document.getElementById('nextUpload').innerHTML =
        minutes +
        ':' +
        seconds.toString().padStart(2, '0');
}


/* ---------------- 7 DAY CHART ---------------- */

async function updateHistoryChart() {

    try {

        const history =
            await fetchHistory();

        const cutoff =
            Date.now() -
            (7 * 24 * 60 * 60 * 1000);

        const recent =
            history.filter(item =>
                new Date(
                    item.updated
                ).getTime() >= cutoff
            );

        const labels =
            recent.map(item =>
                new Date(
                    item.updated
                ).toLocaleString([], {
                    weekday: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            );

        const levels =
            recent.map(item =>
                Number(item.level)
            );

        const ctx =
            document
                .getElementById('levelChart')
                .getContext('2d');

        if (!levelChart) {

            levelChart =
                new Chart(ctx, {

                    type: 'line',

                    data: {

                        labels: labels,

                        datasets: [{
                            label: 'Water Level (m)',
                            data: levels,
                            borderColor: '#ff8c00',
                            backgroundColor: 'rgba(255,140,0,0.15)',
                            borderWidth: 3,
                            pointRadius: 2,
                            pointHoverRadius: 5,
                            tension: 0.25,
                            fill: false
                        }]
                    },

                    options: {

                        responsive: true,
                        maintainAspectRatio: false,

                        plugins: {

                            legend: {
                                labels: {
                                    color: 'white',
                                    font: {
                                        size: 16
                                    }
                                }
                            }
                        },

                        scales: {

                            y: {

                                ticks: {
                                    color: 'white'
                                },

                                grid: {
                                    color: 'rgba(255,255,255,0.15)'
                                },

                                title: {
                                    display: true,
                                    text: 'Level (m)',
                                    color: 'white'
                                }
                            },

                            x: {

                                ticks: {
                                    color: 'white',
                                    autoSkip: true,
                                    maxTicksLimit: 10,
                                    maxRotation: 0
                                },

                                grid: {
                                    color: 'rgba(255,255,255,0.08)'
                                },

                                title: {
                                    display: true,
                                    text: 'Time',
                                    color: 'white'
                                }
                            }
                        }
                    }
                });

        }
        else {

            levelChart.data.labels =
                labels;

            levelChart.data.datasets[0].data =
                levels;

            levelChart.update();
        }

    }
    catch (err) {

        console.log(
            'History chart error:',
            err
        );

    }
}


/* ---------------- START ---------------- */

updateLevel();
updateHistoryChart();
updateCountdown();

setInterval(
    updateLevel,
    10000
);

setInterval(
    updateCountdown,
    1000
);

setInterval(
    updateHistoryChart,
    60000
);


/* ---------------- FULLSCREEN SUPPORT ---------------- */

window.addEventListener(
    'message',
    (event) => {

        if (event.data === 'expandChart') {

            document.body.classList.add(
                'fullscreen-chart'
            );

            if (levelChart) {
                levelChart.resize();
            }
        }

        if (event.data === 'closeChart') {

            document.body.classList.remove(
                'fullscreen-chart'
            );

            if (levelChart) {
                levelChart.resize();
            }
        }
    }
);

</script>

</body>
</html>
    `);
});



// ESP32 uploads here
app.post("/api/upload", async (req, res) => {

    latestLevel = {
        station: req.body.station || "Unknown",
        level: Number(req.body.level),
        status: req.body.status || "Normal",
        firmware: req.body.firmware || "",
        updated: new Date().toISOString()
    };

    levelHistory.push(latestLevel);

    console.log("Upload received:", latestLevel);

    try {

        await pool.query(
            `INSERT INTO level_history
            (station, level, status, firmware, updated)
            VALUES ($1, $2, $3, $4, $5)`,
            [
                latestLevel.station,
                latestLevel.level,
                latestLevel.status,
                latestLevel.firmware,
                latestLevel.updated
            ]
        );

        console.log("Reading saved to Neon");

        res.json({
            success: true
        });

    }
    catch (err) {

        console.log("Neon save failed:", err.message);

        res.status(500).json({
            success: false
        });

    }

});

// Latest data
app.get("/api/latest", (req, res) => {

    res.json(latestLevel);

});   
// Historical data
app.get("/api/history", async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT
                station,
                level,
                status,
                firmware,
                updated
            FROM level_history
            WHERE updated >= NOW() - INTERVAL '7 days'
            ORDER BY updated ASC
        `);

        res.json(result.rows);

    }
    catch (err) {

        console.log("History read failed:", err.message);

        res.status(500).json({
            success: false
        });

    }

});

app.listen(PORT, () => {

    console.log("SYBC Level Monitor running");

});
