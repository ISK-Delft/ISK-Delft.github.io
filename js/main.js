let CSV_FILES = [];

async function loadCsvBestanden() {
  const response = await fetch("Roosters/roosters.json");
  return response.json();
}

function vandaagAlsCsvDatum() {
  const d = new Date();
  const jaar = d.getFullYear();
  const maand = String(d.getMonth() + 1).padStart(2, "0");
  const dag = String(d.getDate()).padStart(2, "0");

  return `${jaar}${maand}${dag}`;
}

function parseDatum(datumString) {
  const str = String(datumString).replaceAll('"', "");

  const jaar = Number(str.substring(0, 4));
  const maand = Number(str.substring(4, 6)) - 1;
  const dag = Number(str.substring(6, 8));

  return new Date(jaar, maand, dag);
}

function formatDatum(datum) {
  const dagen = [
    "zondag", "maandag", "dinsdag", "woensdag",
    "donderdag", "vrijdag", "zaterdag",
  ];

  const maanden = [
    "januari", "februari", "maart", "april", "mei", "juni",
    "juli", "augustus", "september", "oktober", "november", "december",
  ];

  return `${dagen[datum.getDay()]} ${datum.getDate()} ${maanden[datum.getMonth()]}`;
}

async function loadCSV(file) {
  const response = await fetch(file);

  if (!response.ok) {
    console.warn(`Kon CSV niet laden: ${file}`);
    return [];
  }

  const csvText = await response.text();
  const workbook = XLSX.read(csvText, { type: "string" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  return XLSX.utils.sheet_to_json(sheet, { header: 1 });
}

async function loadAllCSVs() {
  const alleRows = [];

  for (const file of CSV_FILES) {
    const rows = await loadCSV(file);
    alleRows.push(...rows);
  }

  return alleRows;
}

function mapBasisRooster(rows) {
  return rows
    .filter((r) => r && r.length > 0)
    .map((r) => {
      const datumString = String(r[0]).replaceAll('"', "");
      const datumObj = parseDatum(datumString);

      return {
        datumString,
        datum: datumObj,
        klas: r[2] || "",
        docent: r[3] || "",
        vak: r[4] || "",
        lokaal: r[5] || "",
        lesuur: Number(r[6]),
      };
    });
}

function renderRooster(data) {
  const container = document.getElementById("tables-container");
  const noData = document.getElementById("no-data");

  container.innerHTML = "";

  if (data.length === 0) {
    noData.style.display = "block";
    return;
  }

  noData.style.display = "none";

  data.sort((a, b) => {
    const klasSortering = (a.klas || "").localeCompare(b.klas || "", "nl", {
      numeric: true,
      sensitivity: "base",
    });

    return klasSortering || a.lesuur - b.lesuur;
  });

  const groepenPerKlas = {};

  data.forEach((item) => {
    if (!item.klas) return;

    if (!groepenPerKlas[item.klas]) {
      groepenPerKlas[item.klas] = [];
    }

    groepenPerKlas[item.klas].push(item);
  });

  Object.keys(groepenPerKlas).forEach((klas) => {
    const table = document.createElement("table");
    table.classList.add("rooster-tabel");

    const tbody = document.createElement("tbody");

    tbody.innerHTML = `
      <tr>
        <th colspan="4">${klas}</th>
      </tr>
      <tr>
        <th>Lesuur</th>
        <th>Vak</th>
        <th>Docent</th>
        <th>Lokaal</th>
      </tr>
    `;

    groepenPerKlas[klas].forEach((item) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${item.lesuur}</td>
        <td>${item.vak}</td>
        <td>${item.docent}</td>
        <td>${item.lokaal}</td>
      `;

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
  });
}

async function init() {
  CSV_FILES = await loadCsvBestanden();

  const vandaag = vandaagAlsCsvDatum();

  const rows = await loadAllCSVs();
  const rooster = mapBasisRooster(rows);

  const roosterVandaag = rooster.filter((item) => item.datumString === vandaag);

  const datumVoorTitel = roosterVandaag[0]?.datum || new Date();

  document.getElementById("page-title").textContent =
    `Roosterwijzigingen – ${formatDatum(datumVoorTitel)}`;

  renderRooster(roosterVandaag);
}

// Elke 5 minuten opnieuw laden
setInterval(() => {
  location.reload();
}, 60 * 1000);

document.addEventListener("DOMContentLoaded", init);