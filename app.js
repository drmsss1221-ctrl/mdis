const LIMITS = {
  cod: 120,
  bod: 45,
  tss: 16,
  tds: 2024,
  phMin: 6.85,
  phMax: 7.48,
  nitrate: 1000,
  fecal: 1600,
};

const STORAGE_KEY = "stp-dashboard-reading";
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1Xpy-oMHwTmPz8NNmyQzWdsfWYXS1iVUR9Q7lns4hJZw/export?format=csv&gid=0";
const POLL_INTERVAL_MS = 30000;

const defaultReading = {
  cod_inlet: 1220,
  cod_outlet: 13,
  bod_inlet: 450,
  bod_outlet: 3.8,
  tss_inlet: 165,
  tss_outlet: 11,
  tds_inlet: 2024,
  tds_outlet: 2084,
  ph_inlet: 6.85,
  ph_outlet: 7.48,
  nitrate_inlet: 1000,
  nitrate_outlet: 8.9,
  fecal_inlet: 1600,
  fecal_outlet: 14,
};

const form = document.getElementById("reading-form");
const tableBody = document.getElementById("parameter-table");
const summaryGrid = document.getElementById("summary-grid");
const plantState = document.getElementById("plant-state");
const plantMessage = document.getElementById("plant-message");
const syncStatus = document.getElementById("sync-status");
const flowDiagram = document.getElementById("flow-diagram");

const loadReading = () => {
  try {
    return { ...defaultReading, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return defaultReading;
  }
};

const saveReading = (reading) => localStorage.setItem(STORAGE_KEY, JSON.stringify(reading));

const setSyncStatus = (text, tone = "good") => {
  if (!syncStatus) return;
  syncStatus.textContent = text;
  syncStatus.className = `sync-status ${tone}`;
};

const normalizeReading = (reading) => {
  const parsed = {};
  for (const [key, value] of Object.entries(reading)) parsed[key] = Number(value);
  return parsed;
};

const parseCsv = (csvText) => {
  const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return null;
  const headers = lines[0].split(",").map((item) => item.trim().toLowerCase());
  const values = lines[1].split(",");
  const row = Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim()]));

  const aliases = {
    cod_inlet: ["cod inlet", "cod_inlet", "inlet cod"],
    cod_outlet: ["cod outlet", "cod_outlet", "outlet cod"],
    bod_inlet: ["bod inlet", "bod_inlet", "inlet bod"],
    bod_outlet: ["bod outlet", "bod_outlet", "outlet bod"],
    tss_inlet: ["tss inlet", "tss_inlet", "inlet tss"],
    tss_outlet: ["tss outlet", "tss_outlet", "outlet tss"],
    tds_inlet: ["tds inlet", "tds_inlet", "inlet tds"],
    tds_outlet: ["tds outlet", "tds_outlet", "outlet tds"],
    ph_inlet: ["ph inlet", "ph_inlet", "inlet ph"],
    ph_outlet: ["ph outlet", "ph_outlet", "outlet ph"],
    nitrate_inlet: ["nitrite + nitrate inlet", "nitrate inlet", "nitrate_inlet"],
    nitrate_outlet: ["nitrite + nitrate outlet", "nitrate outlet", "nitrate_outlet"],
    fecal_inlet: ["fecal coliform inlet", "fecal_inlet"],
    fecal_outlet: ["fecal coliform outlet", "fecal_outlet"],
  };

  const resolved = {};
  for (const [target, names] of Object.entries(aliases)) {
    const key = names.find((name) => headers.includes(name));
    if (key) resolved[target] = row[key];
  }

  return Object.keys(resolved).length >= 8 ? normalizeReading(resolved) : null;
};

const getStatus = (parameter, outlet) => {
  if (parameter === "ph") {
    if (outlet < LIMITS.phMin || outlet > LIMITS.phMax) return "bad";
    return "good";
  }
  if (outlet <= LIMITS[parameter]) return "good";
  if (outlet <= LIMITS[parameter] * 1.15) return "warn";
  return "bad";
};

const LAWS = {
  tss: {
    code: "LAW-01",
    title: "Solid Dilution Mandate",
    trigger: "TSS above limit",
    action: "Pump treated water back into the system until TSS returns to limit.",
    severity: "bad",
  },
  cod: {
    code: "LAW-02",
    title: "Residence Time Stop",
    trigger: "COD above limit",
    action: "Stop inflow and hold the process until COD normalises.",
    severity: "bad",
  },
  bod: {
    code: "LAW-03",
    title: "Residence Time Stop",
    trigger: "BOD above limit",
    action: "Stop inflow and hold the process until BOD normalises.",
    severity: "bad",
  },
  ph: {
    code: "LAW-04",
    title: "pH Correction Rule",
    trigger: "pH outside range",
    action: "Apply neutralisation dosing until pH returns to 6.85-7.48.",
    severity: "bad",
  },
  nitrate: {
    code: "LAW-05",
    title: "Nutrient Recovery Rule",
    trigger: "Nitrite + Nitrate above limit",
    action: "Hold discharge and correct nutrient balance before release.",
    severity: "warn",
  },
  fecal: {
    code: "LAW-06",
    title: "Disinfection Escalation Rule",
    trigger: "Fecal coliform above limit",
    action: "Escalate disinfection and block discharge until compliance is restored.",
    severity: "bad",
  },
  tds: {
    code: "LAW-07",
    title: "Total Dissolved Solids Rule",
    trigger: "TDS above limit",
    action: "Dilute and recheck outlet concentration before discharge.",
    severity: "warn",
  },
  default: {
    code: "LAW-00",
    title: "Compliant State",
    trigger: "Within limit",
    action: "No enforcement required.",
    severity: "good",
  },
};

const rows = [
  { key: "cod", label: "COD", unit: "mg/L", inlet: "cod_inlet", outlet: "cod_outlet", limit: LIMITS.cod },
  { key: "bod", label: "BOD", unit: "mg/L", inlet: "bod_inlet", outlet: "bod_outlet", limit: LIMITS.bod },
  { key: "tss", label: "TSS", unit: "mg/L", inlet: "tss_inlet", outlet: "tss_outlet", limit: LIMITS.tss },
  { key: "tds", label: "TDS", unit: "mg/L", inlet: "tds_inlet", outlet: "tds_outlet", limit: LIMITS.tds },
  { key: "ph", label: "pH", unit: "", inlet: "ph_inlet", outlet: "ph_outlet", limit: `${LIMITS.phMin}-${LIMITS.phMax}` },
  { key: "nitrate", label: "Nitrite + Nitrate as N", unit: "mg/L", inlet: "nitrate_inlet", outlet: "nitrate_outlet", limit: LIMITS.nitrate },
  { key: "fecal", label: "Fecal Coliform", unit: "count", inlet: "fecal_inlet", outlet: "fecal_outlet", limit: LIMITS.fecal },
];

const formatValue = (value, unit) => {
  if (unit === "count") return `${value}`;
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${value}${unit ? ` ${unit}` : ""}`;
};

const flowRatio = (parameter, value) => {
  if (parameter === "ph") {
    const center = (LIMITS.phMin + LIMITS.phMax) / 2;
    const span = LIMITS.phMax - LIMITS.phMin;
    const distance = Math.abs(value - center);
    return Math.max(0.08, 1 - distance / (span / 2));
  }
  return Math.max(0.08, Math.min(1, value / LIMITS[parameter]));
};

const flowClass = (parameter, value, status) => {
  if (status !== "good") return "flow-segment bad";
  return `flow-segment ${parameter === "ph" ? "good ph" : "good"}`;
};

const PARAM_ICONS = {
  cod: `<svg class="param-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2 L5 6 L7 8 L4 11 L8 14 L12 11 L9 8 L11 6 Z" /></svg>`,
  bod: `<svg class="param-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 14 L6 10 M14 2 L8 2 L2 8 L2 14 L8 14 L14 8 Z" /></svg>`,
  tss: `<svg class="param-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3 L14 3 L10 8 L10 14 L6 14 L6 8 Z" /></svg>`,
  tds: `<svg class="param-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 8 L5 5 L8 8 L11 5 L14 8 M2 12 L5 9 L8 12 L11 9 L14 12" /></svg>`,
  ph: `<svg class="param-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2 H10 M8 2 V6 L4 13 H12 L8 6 M5 11 H11" /></svg>`,
  nitrate: `<svg class="param-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 8 L3 3 M8 8 L13 3 M8 8 V13" /><rect x="7" y="7" width="2" height="2" /><rect x="2" y="2" width="2" height="2" /><rect x="12" y="2" width="2" height="2" /><rect x="7" y="13" width="2" height="2" /></svg>`,
  fecal: `<svg class="param-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2 L1 14 H15 Z M8 6 V10 M8 12 V12.5" /></svg>`
};

const renderFlowDiagram = (statuses) => {
  if (!flowDiagram) return;

  const getWorstStatus = (keys) => {
    const subset = keys ? statuses.filter(s => keys.includes(s.key)) : statuses;
    if (subset.some(s => s.status === 'bad')) return 'bad';
    if (subset.some(s => s.status === 'warn')) return 'warn';
    return 'good';
  };

  const serializeData = (keys) => {
    const subset = keys ? statuses.filter(s => keys.includes(s.key)) : statuses;
    return encodeURIComponent(JSON.stringify(subset.map(s => ({
      name: s.label,
      value: s.outlet,
      unit: s.unit,
      status: s.status,
      fill: flowRatio(s.key, s.outlet) * 100
    }))));
  };

  // Helper to get average fill for a stage
  const getAvgFill = (keys) => {
    const subset = statuses.filter(s => keys.includes(s.key));
    if (!subset.length) return 50;
    return subset.reduce((acc, s) => acc + flowRatio(s.key, s.outlet), 0) / subset.length * 100;
  };

  const stages = [
    { name: "Inlet", label: "Solid Separation", keys: ['cod', 'bod'] },
    { name: "Aeration", label: "Aeration Tank", keys: ['ph'] },
    { name: "Sedimentation", label: "Sedimentation", keys: ['tss'] },
    { name: "Outlet", label: "Final Outlet", keys: null } // all
  ];

  const STATUS_COLORS = {
    good: "#50FF80",
    warn: "#FFB800",
    bad: "#FF3E3E"
  };

    <div class="tank-diagram">
      ${stages.map(stage => {
        const worst = getWorstStatus(stage.keys);
        const fill = getAvgFill(stage.keys || rows.map(r => r.key));
        const color = STATUS_COLORS[worst];
        
        return `
          <div class="tank-unit" data-stage="${stage.name}" data-info="${serializeData(stage.keys)}">
            <div class="tank-cap"></div>
            <div class="tank-body">
              <div class="tank-liquid" style="height: ${fill}%; background: linear-gradient(to top, ${color}33, ${color}aa);"></div>
            </div>
            <div class="tank-label">${stage.label}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
};

// Global Card Injection
if (!document.getElementById("tank-expansion-card")) {
  const overlay = document.createElement("div");
  overlay.className = "expansion-overlay";
  overlay.id = "ag-expansion-overlay";
  document.body.appendChild(overlay);

  const card = document.createElement("div");
  card.id = "tank-expansion-card";
  card.className = "tank-expansion-card";
  document.body.appendChild(card);
}

const render = (reading) => {
  const statuses = rows.map((row) => {
    const outlet = Number(reading[row.outlet]);
    const inlet = Number(reading[row.inlet]);
    const status = getStatus(row.key, outlet);
    const law = status === "good" ? LAWS.default : LAWS[row.key];
    return { ...row, inlet, outlet, status, law };
  });

  const badCount = statuses.filter((row) => row.status === "bad").length;
  const warnCount = statuses.filter((row) => row.status === "warn").length;
  const critical = statuses.some((row) => row.key === "cod" && row.status !== "good") ||
    statuses.some((row) => row.key === "bod" && row.status !== "good") ||
    statuses.some((row) => row.key === "tss" && row.status !== "good");

  plantState.textContent = badCount > 0 ? "Enforcement Active" : warnCount > 0 ? "Conditional Hold" : "Normal";
  plantState.className = `hero-card__state ${badCount > 0 ? "bad" : warnCount > 0 ? "warn" : "good"}`;
  plantMessage.textContent = critical
    ? "Mandatory law enforcement is active for one or more process parameters."
    : "All core values are currently within the accepted operating envelope.";

  summaryGrid.innerHTML = [
    { label: "Healthy parameters", value: statuses.filter((row) => row.status === "good").length },
    { label: "Warnings", value: warnCount },
    { label: "Critical alerts", value: badCount },
    { label: "Core action", value: critical ? "Mandatory intervention" : "Stable" },
  ].map((item) => `
    <article class="summary-card">
      <div class="summary-card__label">${item.label}</div>
      <div class="summary-card__value">${item.value}</div>
    </article>
  `).join("");

  tableBody.innerHTML = statuses.map((row) => `
    <tr>
      <td><span class="icon-text">${PARAM_ICONS[row.key]} ${row.label}</span></td>
      <td>${formatValue(row.inlet, row.unit)}</td>
      <td>${formatValue(row.outlet, row.unit)}</td>
      <td>${row.key === "ph" ? row.limit : formatValue(row.limit, row.unit)}</td>
      <td><span class="status-pill ${row.status}">${row.status.toUpperCase()}</span></td>
      <td>
        <div class="law-card">
          <div class="law-card__code">${row.law.code}</div>
          <div class="law-card__title">${row.law.title}</div>
          <div class="law-card__trigger">${row.law.trigger}</div>
          <div class="law-card__action">${row.law.action}</div>
        </div>
      </td>
    </tr>
  `).join("");

  renderFlowDiagram(statuses);
};

const currentReading = loadReading();
render(currentReading);
setSyncStatus("Live sync idle", "good");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const reading = Object.fromEntries([...data.entries()].map(([key, value]) => [key, Number(value)]));
  saveReading(reading);
  render(reading);
  
  // Style the button if not already styled
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.classList.add('btn-ben10');
});

// Initial button styling
document.addEventListener("DOMContentLoaded", () => {
  const submitBtn = form?.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.classList.add('btn-ben10');
    submitBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:12px; vertical-align:middle;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Commit Write`;
  }
});

const syncFromSheet = async () => {
  try {
    setSyncStatus("Syncing from Google Sheet...", "warn");
    const response = await fetch(SHEET_CSV_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csvText = await response.text();
    const sheetReading = parseCsv(csvText);
    if (!sheetReading) throw new Error("Sheet rows did not match the expected column layout");
    saveReading(sheetReading);
    render(sheetReading);
    setSyncStatus("Synced from Google Sheet", "good");
  } catch (error) {
    setSyncStatus("Live sync unavailable; using last saved/manual values", "warn");
    console.error("Sheet sync failed:", error);
  }
};

syncFromSheet();
window.setInterval(syncFromSheet, POLL_INTERVAL_MS);

if (flowDiagram) {
  let hoverTimeout;

  flowDiagram.addEventListener("mouseover", (e) => {
    const unit = e.target.closest(".tank-unit");
    if (!unit) return;

    clearTimeout(hoverTimeout);
    
    const card = document.getElementById("tank-expansion-card");
    const overlay = document.getElementById("ag-expansion-overlay");
    if (!card || !overlay) return;

    const stageName = unit.dataset.stage;
    const info = JSON.parse(decodeURIComponent(unit.dataset.info));
    
    let html = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
        <div>
          <h4 style="margin: 0; font-size: 24px; color: var(--ag-accent); text-transform: uppercase; letter-spacing: 2px;">${stageName}</h4>
          <p style="margin: 4px 0 0; font-size: 10px; opacity: 0.6; letter-spacing: 1px;">STAGE_OPERATIONAL_DATA</p>
        </div>
      </div>
      <div style="display: grid; gap: 16px;">
    `;
    
    info.forEach(item => {
      html += `
        <div style="background: rgba(255,255,255,0.03); border-left: 2px solid ${item.status === 'good' ? 'var(--ag-accent)' : 'var(--ag-' + item.status + ')'}; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 10px; opacity: 0.5; text-transform: uppercase;">${item.name}</div>
            <div style="font-size: 18px; font-weight: 700;">${item.value} <span style="font-size: 10px; opacity: 0.4;">${item.unit}</span></div>
          </div>
          <div style="text-align: right;">
            <div class="status-pill ${item.status}" style="font-size: 9px; padding: 2px 8px;">${item.status}</div>
          </div>
        </div>
      `;
    });
    
    html += `</div>`;
    html += `<div style="margin-top: 24px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; font-size: 11px; color: var(--ag-accent); opacity: 0.8; font-style: italic;">"System monitoring stable. Data verified."</div>`;

    card.innerHTML = html;
    card.classList.add("active");
    overlay.classList.add("active");
  });

  flowDiagram.addEventListener("mouseout", (e) => {
    const unit = e.target.closest(".tank-unit");
    if (!unit) return;

    hoverTimeout = setTimeout(() => {
      const card = document.getElementById("tank-expansion-card");
      const overlay = document.getElementById("ag-expansion-overlay");
      if (card) card.classList.remove("active");
      if (overlay) overlay.classList.remove("active");
    }, 200); // 200ms grace period
  });
}
