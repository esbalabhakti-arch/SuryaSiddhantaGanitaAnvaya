// script.js

// ----------------------------------------------------
// CONFIG: Add your Surya Siddhanta podcast entries here
// Folder structure expected (case-sensitive on GitHub Pages):
//  - Audio/<file>
//  - Images/<transcription-file>.txt
//  - Images/SS_meaning_summaries.xlsx
// ----------------------------------------------------

const TOPIC_LIBRARY = [
  {
    topic: "Surya Siddhanta Sloka",
    episodes: [
      // Example entry:
      // {
      //   id: "SS_Sloka_001",
      //   date: "2026-04-14",
      //   title: "Surya Siddhanta - Sloka 1-5",
      //   audio: "Audio/101_SS_sloka_1_to_5.opus",
      //   transcriptionTxt: "Images/101_SS_Sloka_1_to_5_transcription.txt",
      //   note: "Opening sloka discussion"
      // }
    ]
  },
  {
    topic: "Surya Siddhanta Ganita",
    episodes: [
      // Example entry:
      // {
      //   id: "SS_Ganita_001",
      //   date: "2026-04-14",
      //   title: "Surya Siddhanta - Ganita 1",
      //   audio: "Audio/101_SS_sloka_1_to_5.opus",
      //   transcriptionTxt: "Images/101_SS_Sloka_1_to_5_transcription.txt",
      //   note: "Ganita section discussion"
      // }
    ]
  }
];

// ----------------------------------------------------
// Excel config
// If your 2 tab names are different, change only these.
// ----------------------------------------------------
const SS_XLSX_PATH = "Images/SS_meaning_summaries.xlsx";
const SHEET_FULL_SUMMARY = "Full_Panchadis";
const SHEET_LINE_BY_LINE = "Line_by_Line";

// ----------------------------------------------------
// UI elements
// ----------------------------------------------------
const $ = (id) => document.getElementById(id);

const topicSelect = $("topicSelect");
const podcastSelect = $("dateSelect");

const audioPlayer = $("audioPlayer");
const audioError = $("audioError");

const docTitle = $("docTitle");
const docBody = $("docBody");
const docError = $("docError");

const linkFullSummary = $("linkFullSummary");
const linkLineByLineSummary = $("linkLineByLineSummary");

const excelModalBackdrop = $("excelModalBackdrop");
const excelModalTitle = $("excelModalTitle");
const excelModalBody = $("excelModalBody");
const excelModalClose = $("excelModalClose");
const excelModalOpenFile = $("excelModalOpenFile");

// ----------------------------------------------------
// State
// ----------------------------------------------------
let currentTopic = TOPIC_LIBRARY[0]?.topic || "";
let currentEpisode = null;

let _workbook = null;
let _workbookPromise = null;

// ----------------------------------------------------
// Helpers
// ----------------------------------------------------
function showError(el, msg) {
  if (!el) return;
  el.style.display = "block";
  el.textContent = msg;
}

function clearError(el) {
  if (!el) return;
  el.style.display = "none";
  el.textContent = "";
}

function sortByDateDesc(a, b) {
  return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
}

function findTopicObj(topicName) {
  return TOPIC_LIBRARY.find(t => t.topic === topicName) || null;
}

function findEpisodeById(topicObj, episodeId) {
  if (!topicObj) return null;
  return (topicObj.episodes || []).find(e => e.id === episodeId) || null;
}

function resetPlayer() {
  if (!audioPlayer) return;
  audioPlayer.pause();
  audioPlayer.currentTime = 0;
}

function setPlayerSource(src) {
  if (!audioPlayer) return;
  audioPlayer.src = src;
  audioPlayer.load();
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function txtToHtml(txt) {
  const normalized = txt.replace(/\r/g, "").trim();
  if (!normalized) return "<p>(No content found)</p>";

  const blocks = normalized.split(/\n\s*\n+/g);
  return blocks.map(block => {
    const safe = escapeHtml(block).replace(/\n/g, "<br>");
    return `<p>${safe}</p>`;
  }).join("");
}

async function fetchTxtAsHtml(txtPath) {
  const res = await fetch(txtPath, { cache: "no-cache" });
  if (!res.ok) {
    throw new Error(
      `Could not load file:\n${txtPath}\n\nCheck file name and folder capitalization.`
    );
  }
  const txt = await res.text();
  return txtToHtml(txt);
}

async function loadTxtToHtml(txtPath) {
  clearError(docError);
  if (docBody) docBody.innerHTML = "Loading…";

  try {
    const html = await fetchTxtAsHtml(txtPath);
    docBody.innerHTML = html;
  } catch (err) {
    showError(docError, String(err));
  }
}

// ----------------------------------------------------
// Episode loading
// ----------------------------------------------------
async function loadEpisode(ep) {
  if (!ep) return;

  currentEpisode = ep;
  clearError(audioError);
  clearError(docError);

  resetPlayer();
  setPlayerSource(ep.audio);

  audioPlayer.onerror = () => {
    showError(
      audioError,
      `Audio failed to load:\n${ep.audio}\n\nCheck file path and commit status.`
    );
  };

  if (docTitle) docTitle.textContent = "Transcription";
  await loadTxtToHtml(ep.transcriptionTxt);
}

// ----------------------------------------------------
// UI population
// ----------------------------------------------------
function populateTopicSelect() {
  if (!topicSelect) return;
  topicSelect.innerHTML = "";

  const topics = TOPIC_LIBRARY.map(t => t.topic);
  if (!topics.length) {
    const opt = document.createElement("option");
    opt.textContent = "(No topics yet)";
    topicSelect.appendChild(opt);
    return;
  }

  topics.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    topicSelect.appendChild(opt);
  });

  topicSelect.value = currentTopic || topics[0];
}

function populatePodcastSelect(topicObj) {
  if (!podcastSelect) return;
  podcastSelect.innerHTML = "";

  const eps = (topicObj?.episodes || []).slice().sort(sortByDateDesc);

  if (!eps.length) {
    const opt = document.createElement("option");
    opt.textContent = "(No podcasts yet)";
    podcastSelect.appendChild(opt);

    if (docBody) {
      docBody.innerHTML = "<p>No podcasts added yet for this topic.</p>";
    }
    resetPlayer();
    if (audioPlayer) {
      audioPlayer.removeAttribute("src");
      audioPlayer.load();
    }
    return;
  }

  eps.forEach(ep => {
    const opt = document.createElement("option");
    opt.value = ep.id;
    opt.textContent = `${ep.date} — ${ep.title}`;
    podcastSelect.appendChild(opt);
  });

  podcastSelect.value = eps[0].id;
}

// ----------------------------------------------------
// Excel modal helpers
// ----------------------------------------------------
function openExcelModal(titleText, bodyHtml) {
  if (!excelModalBackdrop || !excelModalTitle || !excelModalBody) return;

  excelModalTitle.textContent = titleText;
  excelModalBody.innerHTML = bodyHtml;

  excelModalBackdrop.style.display = "flex";
  excelModalBackdrop.setAttribute("aria-hidden", "false");
  (excelModalClose || excelModalOpenFile || excelModalBackdrop).focus?.();
}

function closeExcelModal() {
  if (!excelModalBackdrop) return;
  excelModalBackdrop.style.display = "none";
  excelModalBackdrop.setAttribute("aria-hidden", "true");
}

async function loadWorkbookOnce() {
  if (_workbook) return _workbook;
  if (_workbookPromise) return _workbookPromise;

  _workbookPromise = (async () => {
    if (typeof XLSX === "undefined") {
      throw new Error("XLSX library not loaded. Check the SheetJS script tag in index.html.");
    }

    const res = await fetch(SS_XLSX_PATH, { cache: "no-cache" });
    if (!res.ok) {
      throw new Error(
        `Could not load Excel file:\n${SS_XLSX_PATH}\n\nMake sure you uploaded it to the Images folder and the name matches exactly.`
      );
    }

    const buf = await res.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    _workbook = wb;
    return wb;
  })();

  return _workbookPromise;
}

function renderSheetToHtmlTable(wb, sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    const available = (wb.SheetNames || []).join(", ");
    throw new Error(`Sheet not found: "${sheetName}"\n\nAvailable sheets: ${available}`);
  }

  const tableHtml = XLSX.utils.sheet_to_html(ws, {
    id: "excelTable",
    editable: false
  });

  return `<div class="excelTableWrap">${tableHtml}</div>`;
}

async function showWorkbookSheet(sheetName, titleLabel) {
  try {
    openExcelModal(titleLabel, "Loading…");
    const wb = await loadWorkbookOnce();
    const html = renderSheetToHtmlTable(wb, sheetName);

    const header = `
      <div style="margin-bottom:10px;color:rgba(255,255,255,0.75);font-size:12.5px;">
        Source: <span style="opacity:0.9">${SS_XLSX_PATH}</span> (Sheet: <strong>${sheetName}</strong>)
      </div>
    `;

    openExcelModal(titleLabel, header + html);
  } catch (err) {
    openExcelModal(
      titleLabel,
      `<div style="white-space:pre-wrap;color:rgba(255,255,255,0.92);">${escapeHtml(String(err))}</div>`
    );
  }
}

// ----------------------------------------------------
// Event handlers
// ----------------------------------------------------
topicSelect?.addEventListener("change", async () => {
  currentTopic = topicSelect.value;
  const topicObj = findTopicObj(currentTopic);
  populatePodcastSelect(topicObj);

  const ep = findEpisodeById(topicObj, podcastSelect.value);
  if (ep) await loadEpisode(ep);
});

podcastSelect?.addEventListener("change", async () => {
  const topicObj = findTopicObj(currentTopic);
  const ep = findEpisodeById(topicObj, podcastSelect.value);
  if (ep) await loadEpisode(ep);
});

linkFullSummary?.addEventListener("click", async () => {
  await showWorkbookSheet(SHEET_FULL_SUMMARY, "Surya Siddhānta meanings summary");
});

linkLineByLineSummary?.addEventListener("click", async () => {
  await showWorkbookSheet(SHEET_LINE_BY_LINE, "Line by line meanings");
});

excelModalClose?.addEventListener("click", closeExcelModal);

excelModalOpenFile?.addEventListener("click", () => {
  window.open(SS_XLSX_PATH, "_blank", "noopener");
});

excelModalBackdrop?.addEventListener("click", (e) => {
  if (e.target === excelModalBackdrop) closeExcelModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && excelModalBackdrop?.style.display === "flex") {
    closeExcelModal();
  }
});

// ----------------------------------------------------
// Initial load
// ----------------------------------------------------
(function init() {
  populateTopicSelect();

  const topicObj = findTopicObj(topicSelect?.value || currentTopic);
  currentTopic = topicObj?.topic || currentTopic;

  populatePodcastSelect(topicObj);

  const ep = findEpisodeById(topicObj, podcastSelect.value);
  if (ep) {
    loadEpisode(ep);
  } else if (docBody) {
    docBody.innerHTML = "<p>No podcasts added yet for this topic.</p>";
  }
})();