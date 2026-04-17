document.addEventListener("DOMContentLoaded", () => {
    const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1Xpy-oMHwTmPz8NNmyQzWdsfWYXS1iVUR9Q7lns4hJZw/export?format=csv&gid=0";
    
    // Elements
    const pieCanvas = document.getElementById("compliance-pie-chart");
    const legendContainer = document.getElementById("compliance-legend");
    const trendCanvas = document.getElementById("trend-line-chart");
    const tableBody = document.getElementById("history-table-body");

    // Colors
    const colors = {
        good: "#35d07f",
        warn: "#ffb020",
        bad: "#ff6b6b"
    };

    // Helper: Draw Pie Chart
    function drawPieChart(ctx, data, x, y, radius) {
        ctx.clearRect(0, 0, pieCanvas.width, pieCanvas.height);
        
        let total = data.reduce((sum, item) => sum + item.value, 0);
        if (total === 0) return; // No data

        let startAngle = -Math.PI / 2; // start from top
        
        data.forEach(item => {
            const sliceAngle = (item.value / total) * 2 * Math.PI;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.arc(x, y, radius, startAngle, startAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = item.color;
            ctx.fill();
            
            // Draw a subtle border
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#101b27"; // panel background to separate slices
            ctx.stroke();

            // Label text roughly at center of slice
            if (item.value > 0) {
                const textAngle = startAngle + sliceAngle / 2;
                const textX = x + Math.cos(textAngle) * (radius * 0.6);
                const textY = y + Math.sin(textAngle) * (radius * 0.6);
                
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 14px 'Array', sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                const percentage = Math.round((item.value / total) * 100) + "%";
                ctx.fillText(percentage, textX, textY);
            }

            startAngle += sliceAngle;
        });
    }

    // Update compliance pie chart from live DOM
    function updateCompliancePie() {
        if (!pieCanvas || !legendContainer) return;
        const ctx = pieCanvas.getContext("2d");
        
        const tableRows = document.querySelectorAll("#parameter-table tr");
        if (!tableRows.length) return;
        
        let counts = { good: 0, warn: 0, bad: 0 };
        
        tableRows.forEach(row => {
            const pill = row.querySelector(".status-pill");
            if (!pill) return;
            if (pill.classList.contains("good")) counts.good++;
            else if (pill.classList.contains("warn")) counts.warn++;
            else if (pill.classList.contains("bad")) counts.bad++;
        });

        const pieData = [
            { label: "Good", value: counts.good, color: colors.good },
            { label: "Warn", value: counts.warn, color: colors.warn },
            { label: "Bad", value: counts.bad, color: colors.bad }
        ];

        drawPieChart(ctx, pieData, pieCanvas.width / 2, pieCanvas.height / 2, Math.min(pieCanvas.width, pieCanvas.height) / 2.2);

        // Update Legend
        legendContainer.innerHTML = pieData.map(item => `
            <div class="legend-item">
                <div class="legend-dot" style="background:${item.color}"></div>
                <span>${item.label} (${item.value})</span>
            </div>
        `).join("");
    }

    // Helper: format manual dates if none provided
    function formatDate(dateObj) {
        const hh = String(dateObj.getHours()).padStart(2, '0');
        const mm = String(dateObj.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    }

    // Draw Line Chart
    function drawLineChart(ctx, historyData) {
        // historyData structure: [ { time: string, cod: number, ph: number } ]
        ctx.clearRect(0, 0, trendCanvas.width, trendCanvas.height);
        
        const padding = { top: 20, right: 20, bottom: 30, left: 40 };
        const width = trendCanvas.width;
        const height = trendCanvas.height;
        const graphWidth = width - padding.left - padding.right;
        const graphHeight = height - padding.top - padding.bottom;

        // Determine max Y values for dual axis mapping, or simple mapped logic.
        // COD max around 200, pH max around 14.
        const codLimit = LIMITS.cod || 120;
        const phMax = LIMITS.phMax || 7.48;
        const phMin = LIMITS.phMin || 6.85;

        // Auto bounds for COD
        const codMaxVal = Math.max(...historyData.map(d => d.cod), codLimit * 1.5, 50);
        const codMinVal = 0;
        
        // Auto bounds for pH
        const phMaxVal = Math.max(...historyData.map(d => d.ph), phMax + 1, 9);
        const phMinVal = Math.min(...historyData.map(d => d.ph), phMin - 1, 6);

        function mapX(index) {
            if (historyData.length <= 1) return padding.left + graphWidth / 2;
            return padding.left + (index / (historyData.length - 1)) * graphWidth;
        }

        function mapYCod(val) {
            const ratio = (val - codMinVal) / (codMaxVal - codMinVal);
            return padding.top + graphHeight - (ratio * graphHeight);
        }

        function mapYPh(val) {
            const ratio = (val - phMinVal) / (phMaxVal - phMinVal);
            return padding.top + graphHeight - (ratio * graphHeight);
        }

        // Draw Axes and Thresholds
        ctx.beginPath();
        // Base line
        ctx.moveTo(padding.left, height - padding.bottom);
        ctx.lineTo(width - padding.right, height - padding.bottom);
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.stroke();

        // COD Limit Line (dashed)
        const codLimitY = mapYCod(codLimit);
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(padding.left, codLimitY);
        ctx.lineTo(width - padding.right, codLimitY);
        ctx.strokeStyle = colors.bad;
        ctx.stroke();
        ctx.setLineDash([]); 

        // Draw COD Line
        ctx.beginPath();
        historyData.forEach((d, i) => {
            const x = mapX(i);
            const y = mapYCod(d.cod);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = "#57c4ff"; // Blue accent for COD
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw pH Line
        ctx.beginPath();
        historyData.forEach((d, i) => {
            const x = mapX(i);
            const y = mapYPh(d.ph);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = "#a78bfa"; // Purple accent for pH
        ctx.lineWidth = 2;
        ctx.stroke();

        // Labels
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.font = "10px 'Array', sans-serif";
        ctx.fillText(`COD Limit (${codLimit})`, padding.left + 5, codLimitY - 5);
        ctx.fillStyle = "#57c4ff";
        ctx.fillText("COD (mg/L)", width - padding.right - 60, padding.top);
        ctx.fillStyle = "#a78bfa";
        ctx.fillText("pH", width - padding.right - 20, padding.top + 15);
    }

    // Process and render history data
    async function loadAnalyticsData() {
        try {
            const response = await fetch(SHEET_CSV_URL, { cache: "no-store" });
            const csvText = await response.text();
            
            const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
            if (lines.length < 2) {
                if (tableBody) tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No history data found.</td></tr>`;
                return;
            }
            
            const headers = lines[0].split(",").map(item => item.trim().toLowerCase());
            
            // Map headers to identify our target columns
            const getIndex = (aliases) => {
                for (let i = 0; i < headers.length; i++) {
                    if (aliases.some(alias => headers[i].includes(alias))) return i;
                }
                return -1;
            };

            const timeIdx = getIndex(["timestamp", "time", "date"]);
            
            // Re-use logic from app.js alias definitions
            const resolvedIndexes = {};
            // We use the same parameter rows globally defined in app.js
            rows.forEach(paramRow => {
                 resolvedIndexes[paramRow.key] = {
                     outlet: getIndex([paramRow.outlet.toLowerCase(), paramRow.outlet.replace("_", " ")])
                 };
            });

            // Extract historical array
            // Reverse so oldest is first for the line chart if needed, 
            // but usually Google Sheets top row is header, row 2 is oldest, bottom is newest.
            // Wait, parseCsv in app.js reads lines[1], meaning lines[1] might be newest.
            // Let's assume down the rows is chronology (row 1 = newest or oldest). We'll keep original order.
            const history = [];
            const threatEvents = [];

            // We loop from row 1 to End
            let timeTracker = new Date(Date.now() - (lines.length * 5 * 60000)); // Mock base time if missing
            
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(",");
                const timeStr = timeIdx !== -1 && values[timeIdx] ? values[timeIdx] : formatDate(timeTracker);
                timeTracker = new Date(timeTracker.getTime() + 5 * 60000); // add 5 mins step

                // Extract parameters for line chart
                const codIdx = resolvedIndexes["cod"].outlet;
                const phIdx = resolvedIndexes["ph"].outlet;
                
                const codVal = codIdx !== -1 ? Number(values[codIdx]) : 0;
                const phVal = phIdx !== -1 ? Number(values[phIdx]) : 7;
                
                history.push({ time: timeStr, cod: codVal, ph: phVal });

                // Check for threats using global getStatus from app.js
                rows.forEach(paramRow => {
                    const outIdx = resolvedIndexes[paramRow.key].outlet;
                    if (outIdx !== -1) {
                        const val = Number(values[outIdx]);
                        const status = getStatus(paramRow.key, val);
                        if (status === "warn" || status === "bad") {
                            threatEvents.push({
                                time: timeStr,
                                parameter: paramRow.label,
                                value: val,
                                unit: paramRow.unit,
                                status: status
                            });
                        }
                    }
                });
            }

            // Draw Line Chart
            if (trendCanvas) {
                // If history is huge, truncate to last 50 points
                const recentHistory = history.slice(-50);
                drawLineChart(trendCanvas.getContext("2d"), recentHistory);
            }

            // Populate Table
            if (tableBody) {
                // Sort threat events newest first (assuming array order is chronological, we reverse it)
                threatEvents.reverse();
                
                // Show latest N events (e.g., top 10)
                const topEvents = threatEvents.slice(0, 10);
                
                if (topEvents.length === 0) {
                    tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--muted)">No critical threats recorded.</td></tr>`;
                } else {
                    tableBody.innerHTML = topEvents.map(event => `
                        <tr>
                            <td class="icon-text"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${event.time}</td>
                            <td>${event.parameter}</td>
                            <td><span style="font-variant-numeric: tabular-nums; font-weight:700;">${event.value}</span> ${event.unit}</td>
                            <td><span class="status-pill ${event.status}">${event.status.toUpperCase()}</span></td>
                        </tr>
                    `).join("");
                }
            }

        } catch (e) {
            console.error("Analytics History fetch error:", e);
            if (tableBody) tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--bad)">Failed to load historical data.</td></tr>`;
        }
    }

    // Initialize 
    setTimeout(() => {
        updateCompliancePie();
        loadAnalyticsData();
    }, 500);

    // Refresh every 10s
    setInterval(() => {
        updateCompliancePie();
    }, 10000);
});
