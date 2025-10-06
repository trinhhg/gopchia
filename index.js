// Tab switching
const tabGop = document.getElementById("tab-gop");
const tabChia = document.getElementById("tab-chia");
const gopSection = document.getElementById("gop-chuong");
const chiaSection = document.getElementById("chia-chuong");

tabGop.onclick = () => switchTab("gop");
tabChia.onclick = () => switchTab("chia");

function switchTab(tab) {
  tabGop.classList.toggle("active", tab === "gop");
  tabChia.classList.toggle("active", tab === "chia");
  gopSection.classList.toggle("active", tab === "gop");
  chiaSection.classList.toggle("active", tab === "chia");
}

// Word count function
function countWords(text) {
  return text.trim() ? text.match(/\b\w+\b/g)?.length || 0 : 0;
}

// Gộp chương
document.getElementById("btn-gop").onclick = () => {
  const text = document.getElementById("gop-input").value;
  if (!text.trim()) return alert("Vui lòng nhập nội dung!");

  // Split chapters by regex
  const lines = text.split(/(?=Chương\s+\d+\.\d+)/gi);
  const chapters = {};

  lines.forEach(ch => {
    const match = ch.match(/Chương\s+(\d+)\.\d+\s*:\s*([^\n]*)/i);
    if (match) {
      const main = match[1];
      const content = ch.replace(/Chương\s+\d+\.\d+\s*:[^\n]*\n?/, "").trim();
      chapters[main] = (chapters[main] || "") + (content ? content + "\n\n" : "");
    }
  });

  const resultDiv = document.getElementById("gop-results");
  resultDiv.innerHTML = "";
  for (const key in chapters) {
    const wordCount = countWords(chapters[key]);
    const div = document.createElement("div");
    div.className = "chapter-card";
    div.innerHTML = `
      <h3>Chương ${key}</h3>
      <textarea readonly>${chapters[key]}</textarea>
      <div class="word-count">${wordCount} từ</div>
      <button class="download-docx" data-num="${key}">Tải DOCX</button>
    `;
    resultDiv.appendChild(div);
  }

  // Download individual DOCX
  document.querySelectorAll(".download-docx").forEach(btn => {
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

  // Download all as ZIP
  document.getElementById("download-all").onclick = async () => {
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
};

// Tạo nút chia chương
const splitContainer = document.getElementById("split-options");
for (let i = 2; i <= 10; i++) {
  const btn = document.createElement("button");
  btn.textContent = i;
  btn.onclick = () => selectSplit(i);
  splitContainer.appendChild(btn);
}

let currentSplit = 2;
function selectSplit(num) {
  currentSplit = num;
  document.querySelectorAll(".output-box").forEach((el, i) => {
    el.classList.toggle("active", i < num);
  });
  document.querySelectorAll("#split-options button").forEach(btn => {
    btn.classList.toggle("active", parseInt(btn.textContent) === num);
  });
}

// Tạo sẵn 11 ô output
const results = document.getElementById("chia-results");
for (let i = 1; i <= 11; i++) {
  const box = document.createElement("div");
  box.className = `output-box ${i <= 2 ? "active" : ""}`;
  box.innerHTML = `
    <textarea id="out${i}" readonly></textarea>
    <div class="word-count">0 từ</div>
    <button class="copy-btn" data-id="${i}">Sao chép ${i}</button>
  `;
  results.appendChild(box);
}

// Word count realtime
const chiaInput = document.getElementById("chia-input");
const countDiv = document.getElementById("word-count");
const gopInput = document.getElementById("gop-input");
const gopCountDiv = gopSection.querySelector(".word-count");

chiaInput.addEventListener("input", e => {
  const words = countWords(e.target.value);
  countDiv.textContent = `${words} từ`;
});

gopInput.addEventListener("input", e => {
  const words = countWords(e.target.value);
  gopCountDiv.textContent = `${words} từ`;
});

// Chia chương
document.getElementById("btn-chia").onclick = () => {
  const text = chiaInput.value.trim();
  if (!text) return alert("Vui lòng nhập nội dung!");

  const parts = splitText(text, currentSplit);
  parts.forEach((p, i) => {
    const out = document.getElementById(`out${i + 1}`);
    out.value = `Chương 1.${i + 1}\n\n${p.trim()}`;
    const wordCount = countWords(p);
    out.nextElementSibling.textContent = `${wordCount} từ`;
  });
};

// Chia đều văn bản (chia mềm, không cắt giữa câu)
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

    // Tìm vị trí kết thúc câu gần nhất
    while (end < totalLength && !/[.!?]\s/.test(text[end])) {
      end++;
    }
    if (end < totalLength) end++; // Bỏ qua ký tự khoảng trắng
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
    setTimeout(() => e.target.textContent = `Sao chép ${id}`, 1000);
  }
});
