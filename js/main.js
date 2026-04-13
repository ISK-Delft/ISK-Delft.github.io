const CSV_FILE = "Roosters/dag 19-01 tm 23-01.csv";

const DAG_NAMEN = {
  1: "Maandag",
  2: "Dinsdag",
  3: "Woensdag",
  4: "Donderdag",
  5: "Vrijdag",
};

let slides = [];
let currentSlide = 0;

function getVandaagDagNummer() {
  const vandaag = new Date().getDay();

  if (vandaag === 0 || vandaag === 6) {
    return null; // weekend
  }

  return vandaag; // maandag=1 t/m vrijdag=5
}

// NIEUW: datum omzetten naar dagnummer (1-5)
function parseDatum(datumString) {
  const str = String(datumString);

  const jaar = parseInt(str.substring(0, 4));
  const maand = parseInt(str.substring(4, 6)) - 1; // JS maand = 0-11
  const dag = parseInt(str.substring(6, 8));

  return new Date(jaar, maand, dag);
}

function getVandaagTekst() {
  const datum = new Date();

  const dagen = [
    "zondag",
    "maandag",
    "dinsdag",
    "woensdag",
    "donderdag",
    "vrijdag",
    "zaterdag",
  ];
  const maanden = [
    "januari",
    "februari",
    "maart",
    "april",
    "mei",
    "juni",
    "juli",
    "augustus",
    "september",
    "oktober",
    "november",
    "december",
  ];

  return `${dagen[datum.getDay()]} ${datum.getDate()} ${maanden[datum.getMonth()]}`;
}

function formatDatum(datum) {
  const maanden = [
    "januari",
    "februari",
    "maart",
    "april",
    "mei",
    "juni",
    "juli",
    "augustus",
    "september",
    "oktober",
    "november",
    "december",
  ];

  return `${datum.getDate()} ${maanden[datum.getMonth()]}`;
}

async function loadCSV() {
  const response = await fetch(CSV_FILE);
  const csvText = await response.text();

  const workbook = XLSX.read(csvText, { type: "string" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  // GEEN headers → array van arrays
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  return rows;
}

function mapBasisRooster(rows) {
  return rows.map((r) => {
    const datumObj = parseDatum(r[0]);

    return {
      datum: datumObj,
      datumFormatted: formatDatum(datumObj),
      dag: datumObj.getDay(), // 1-5
      klas: r[2] || "",
      docent: r[3] || "",
      vak: r[4] || "",
      lokaal: r[5] || "",
      lesuur: Number(r[6]),
    };
  });
}

function groepeerRooster(data) {
  const groepen = {};

  data.forEach((item) => {
    if (!groepen[item.dag]) {
      groepen[item.dag] = {};
    }

    if (!groepen[item.dag][item.lesuur]) {
      groepen[item.dag][item.lesuur] = [];
    }

    groepen[item.dag][item.lesuur].push(item);
  });

  return groepen;
}

function maakSlides(groepen) {
  slides = [];

  Object.keys(groepen)
    .sort((a, b) => a - b)
    .forEach((dag) => {
      slides.push({
        dag: dag,
        data: groepen[dag],
      });
    });
}

function renderSlide() {
  const container = document.getElementById("tables-container");
  container.innerHTML = "";

  if (slides.length === 0) return;

  const slide = slides[currentSlide];

  const alleLesuren = Object.keys(slide.data).sort((a, b) => a - b);

  let allData = [];

  alleLesuren.forEach((lesuur) => {
    allData.push({ type: "header", lesuur });

    slide.data[lesuur].forEach((item) => {
      allData.push({ type: "row", item });
    });
  });

  const kolommen = 5;
  const perKolom = Math.ceil(allData.length / kolommen);

  let chunks = [];

  for (let i = 0; i < kolommen; i++) {
    chunks.push(allData.slice(i * perKolom, (i + 1) * perKolom));
  }

  chunks.forEach((chunk) => {
    const table = document.createElement("table");
    table.classList.add("rooster-tabel");

    const tbody = document.createElement("tbody");

    // 🔥 KOLOM HEADERS (alleen 1x, zonder datum/dag)
    const columnHeader = document.createElement("tr");
    columnHeader.innerHTML = `
      <th>Klas</th>
      <th>Vak</th>
      <th>Docent</th>
      <th>Lokaal</th>
    `;
    tbody.appendChild(columnHeader);

    chunk.forEach((entry) => {
      if (entry.type === "header") {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td colspan="4" style="
            font-weight: bold;
            text-align: center;
            background: rgba(240,240,240,0.9);
            padding: 2px;
          ">
            Lesuur ${entry.lesuur}
          </td>
        `;
        tbody.appendChild(tr);
      }

      if (entry.type === "row") {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${entry.item.klas}</td>
          <td>${entry.item.vak}</td>
          <td>${entry.item.docent}</td>
          <td>${entry.item.lokaal}</td>
        `;
        tbody.appendChild(tr);
      }
    });

    table.appendChild(tbody);
    container.appendChild(table);
  });

  // 🔥 BELANGRIJK: titel buiten de tabellen zetten
  const eersteLesuur = Object.values(slide.data)[0];
  const firstItem = eersteLesuur?.[0];

  let datumText = "";

  if (firstItem?.datum) {
    const datum = firstItem.datum;

    const dagen = [
      "zondag",
      "maandag",
      "dinsdag",
      "woensdag",
      "donderdag",
      "vrijdag",
      "zaterdag",
    ];
    const maanden = [
      "januari",
      "februari",
      "maart",
      "april",
      "mei",
      "juni",
      "juli",
      "augustus",
      "september",
      "oktober",
      "november",
      "december",
    ];

    datumText = `${dagen[datum.getDay()]} ${datum.getDate()} ${maanden[datum.getMonth()]}`;
  }

  document.getElementById("page-title").textContent =
    `Roosterwijzigingen – ${datumText}`;
}

function startSlideshow() {
  renderSlide();

  setInterval(() => {
    currentSlide++;

    if (currentSlide >= slides.length) {
      currentSlide = 0;
    }

    renderSlide();
  }, 10000);
}

async function init() {
  document.getElementById("page-title").textContent = `Roosterwijzigingen`;

  const rows = await loadCSV();
  const rooster = mapBasisRooster(rows);

  const groepen = groepeerRooster(rooster);

  maakSlides(groepen);

  startSlideshow();
}

document.addEventListener("DOMContentLoaded", init);
