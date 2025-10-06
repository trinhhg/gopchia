// Tab switching
const tabMerge = document.getElementById("tab-merge");
const tabSplit = document.getElementById("tab-split");
const mergeTab = document.getElementById("merge-tab");
const splitTab = document.getElementById("split-tab");

tabMerge.onclick = () => switchTab("merge");
tabSplit.onclick = () => switchTab("split");

function switchTab(tab) {
  tabMerge.classList.toggle("active", tab === "merge");
  tabSplit.classList.toggle("active", tab === "split");
  mergeTab.classList.toggle("hidden", tab !== "merge");
  splitTab.classList.toggle("hidden", tab !== "split");
}

// Word count function
function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Gộp chương
let chapters = {}; // Lưu trữ chương để tải file

document.getElementById("merge-btn").onclick = () => {
  const text = document.getElementById("merge-input-text").value;
  if (!text.trim()) return alert("Vui lòng nhập nội dung!");

  chapters = {};
  const lines = text.split(/(?=Chương\s+\d+\.\d+)/gi);

  lines.forEach(ch => {
    const match = ch.match(/Chương\s+(\d+)\.\d+\s*:\s*([^\n]*)/i);
    if (match) {
      const main = match[1];
      const content = ch.replace(/Chương\s+\d+\.\d+\s*:[^\n]*\n?/, "").trim();
      chapters[main] = (chapters[main] || "") + (content ? content + "\n\n" : "");
    }
  });

  const mergedList = document.getElementById("merged-list");
  mergedList.innerHTML = "";
  const chapterDownloads = document.getElementById("chapter-downloads");
  chapterDownloads.innerHTML = "";

  for (const key in chapters) {
    const wordCount = countWords(chapters[key]);
    const item = document.createElement("div");
    item.className = "chapter-item";
    item.innerHTML = `
      <div class="chapter-header">
        <span>Chương ${key} (${wordCount} từ)</span>
        <span>⬇️</span>
      </div>
      <div class="chapter-content">
        <textarea readonly>${chapters[key]}</textarea>
      </div>
    `;
    mergedList.appendChild(item);

    // Accordion toggle
    item.querySelector(".chapter-header").onclick = () => {
      const content = item.querySelector(".chapter-content");
      content.classList.toggle("active");
      item.querySelector("span:last-child").textContent = content.classList.contains("active") ? "⬆️" : "⬇️";
    };

    // Nút tải riêng
    const dlBtn = document.createElement("button");
    dlBtn.className = "chapter-download-btn";
    dlBtn.textContent = `Tải Chương ${key} (DOCX)`;
    dlBtn.dataset.num = key;
    chapterDownloads.appendChild(dlBtn);
  }

  // Download individual DOCX
  document.querySelectorAll(".chapter-download-btn").forEach(btn => {
    btn.onclick = async () => {
      const num = btn.dataset.num;
      const doc = new docx.Document({
        sections: [{
          properties: {},
          children: [
            new docx.Paragraph({
              text: `Chương ${num}`,
              heading: docx.HeadingLevel.HEADING_1
            }),
            new docx.Paragraph(chapters[num])
          ]
        }]
      });
      const blob = await docx.Packer.toBlob(doc);
      saveAs(blob, `Chuong_${num}.docx`);
    };
  });
};

// Download all as ZIP
document.getElementById("download-all").onclick = async () => {
  if (Object.keys(chapters).length === 0) return alert("Chưa có chương để tải!");
  const zip = new JSZip();
  const folderName = document.getElementById("folder-name").value || "GopChuong";
  const folder = zip.folder(folderName);

  for (const key in chapters) {
    const doc = new docx.Document({
      sections: [{
        properties: {},
        children: [
          new docx.Paragraph({
            text: `Chương ${key}`,
            heading: docx.HeadingLevel.HEADING_1
          }),
          new docx.Paragraph(chapters[key])
        ]
      }]
    });
    const blob = await docx.Packer.toBlob(doc);
    folder.file(`Chuong_${key}.docx`, blob);
  }

  zip.generateAsync({ type: "blob" }).then(blob => {
    saveAs(blob, `${folderName}.zip`);
  });
};

// Word count realtime for merge
document.getElementById("merge-input-text").addEventListener("input", e => {
  const words = countWords(e.target.value);
  document.getElementById("merge-wordcount").textContent = `${words} từ`;
});

// Tạo nút chia chương
const splitOptions = document.getElementById("split-options");
for (let i = 2; i <= 10; i++) {
  const btn = document.createElement("button");
  btn.className = "split-count";
  btn.dataset.n = i;
  btn.textContent = i;
  btn.onclick = () => selectSplit(i);
  splitOptions.appendChild(btn);
}

let currentSplit = 2;
document.querySelector('.split-count[data-n="2"]').classList.add("active");

function selectSplit(num) {
  currentSplit = num;
  document.querySelectorAll(".split-count").forEach(btn => {
    btn.classList.toggle("active", parseInt(btn.dataset.n) === num);
  });
  document.querySelectorAll(".output-box").forEach((el, i) => {
    el.classList.toggle("active", i < num);
  });
}

// Tạo sẵn 11 ô output
const splitResults = document.getElementById("split-results");
for (let i = 1; i <= 11; i++) {
  const box = document.createElement("div");
  box.className = `output-box ${i <= 2 ? "active" : ""}`;
  box.innerHTML = `
    <h4>Chương 1.${i}</h4>
    <textarea id="out${i}" readonly></textarea>
    <span class="word-count">0 từ</span>
    <button class="copy-btn" data-id="${i}">Sao chép</button>
  `;
  splitResults.appendChild(box);
}

// Word count realtime for split
const splitInput = document.getElementById("split-input");
splitInput.addEventListener("input", e => {
  const words = countWords(e.target.value);
  document.getElementById("split-wordcount").textContent = `${words} từ`;
});

// Chia chương
document.getElementById("split-btn").onclick = () => {
  const text = splitInput.value.trim();
  if (!text) return alert("Vui lòng nhập nội dung!");

  const parts = splitText(text, currentSplit);
  parts.forEach((p, i) => {
    const out = document.getElementById(`out${i + 1}`);
    out.value = p.trim();
    const wordCount = countWords(p);
    out.parentElement.querySelector(".word-count").textContent = `${wordCount} từ`;
    out.parentElement.querySelector("h4").textContent = `Chương 1.${i + 1}`;
  });
};

// Chia đều văn bản (chia mềm, ngắt ở dấu chấm hoặc xuống dòng)
function splitText(text, parts) {
  const totalLength = text.length;
  const chunkSize = Math.ceil(totalLength / parts);
  const chunks = [];
  let start = 0;

  for (let i = 0; i < parts; i++) {
    let end = start + chunkSize;
    if (end >= totalLength) {
      chunks.push(text.slice(start));
      break;
    }

    // Tìm vị trí ngắt gần nhất: dấu chấm, dấu chấm than, dấu hỏi, hoặc xuống dòng
    while (end < totalLength && !/[.!?]\s|\n/.test(text[end])) {
      end++;
    }
    if (end < totalLength) end++; // Bỏ qua khoảng trắng hoặc xuống dòng
    chunks.push(text.slice(start, end));
    start = end;
  }

  return chunks;
}

// Sao chép nội dung
document.addEventListener("click", e => {
  if (e.target.classList.contains("copy-btn")) {
    const id = e.target.dataset.id;
    const ta = document.getElementById(`out${id}`);
    ta.select();
    document.execCommand("copy");
    e.target.textContent = "Đã sao chép!";
    setTimeout(() => e.target.textContent = `Sao chép`, 1000);
  }
});
