// Tab switching
const tabMerge = document.getElementById("tab-merge");
const tabSplit = document.getElementById("tab-split");
const mergeTab = document.getElementById("merge-tab");
const splitTab = document.getElementById("split-tab");

tabMerge.onclick = () => switchTab("merge");
tabSplit.onclick = () => switchTab("split");

function switchTab(tab) {
  tabMerge.classList.toggle("active", tab === "merge");
  tabSplit.classList.toggle("active", tab !== "merge");
  mergeTab.classList.toggle("hidden", tab !== "merge");
  splitTab.classList.toggle("hidden", tab === "merge");
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

  chapters = groupChapters(text);

  const mergedList = document.getElementById("merged-list");
  mergedList.innerHTML = "";
  const chapterDownloads = document.getElementById("chapter-downloads");
  chapterDownloads.innerHTML = "";

  chapters.forEach((ch, index) => {
    const num = ch.title.split(' ')[1];
    const wordCount = countWords(ch.text);
    const item = document.createElement("div");
    item.className = "chapter-item";
    item.innerHTML = `
      <div class="chapter-header">
        <span>${ch.title} (${wordCount} từ)</span>
        <span>⬇️</span>
      </div>
      <div class="chapter-content">
        <textarea readonly>${ch.text}</textarea>
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
    dlBtn.textContent = `Tải Chương ${num} (DOCX)`;
    dlBtn.dataset.num = num;
    dlBtn.dataset.text = ch.text;
    chapterDownloads.appendChild(dlBtn);
  });

  // Download individual DOCX
  document.querySelectorAll(".chapter-download-btn").forEach(btn => {
    btn.onclick = async () => {
      const num = btn.dataset.num;
      const text = btn.dataset.text;
      const doc = new docx.Document({
        sections: [{
          properties: {},
          children: [
            new docx.Paragraph({
              text: `Chương ${num}`,
              heading: docx.HeadingLevel.HEADING_1
            }),
            new docx.Paragraph(text)
          ]
        }]
      });
      const blob = await docx.Packer.toBlob(doc);
      saveAs(blob, `Chuong_${num}.docx`);
    };
  });
};

// Logic group chapters
function groupChapters(text) {
  const lines = text.split(/\n+/);
  const chaptersMap = {};
  let currentMain = null;

  lines.forEach(line => {
    const match = line.match(/Chương\s+(\d+)\.(\d+)/i);
    if (match) {
      const main = match[1];
      if (!chaptersMap[main]) chaptersMap[main] = [];
      currentMain = main;
      chaptersMap[main].push(line);
    } else if (currentMain) {
      chaptersMap[currentMain].push(line);
    }
  });

  return Object.entries(chaptersMap).map(([num, content]) => ({
    title: `Chương ${num}`,
    text: content.join('\n').trim()
  }));
}

// Download all as ZIP
document.getElementById("download-all").onclick = async () => {
  if (chapters.length === 0) return alert("Chưa có chương để tải!");
  const zip = new JSZip();
  const folderName = document.getElementById("folder-name").value || "GopChuong";
  const folder = zip.folder(folderName);

  for (const ch of chapters) {
    const num = ch.title.split(' ')[1];
    const doc = new docx.Document({
      sections: [{
        properties: {},
        children: [
          new docx.Paragraph({
            text: ch.title,
            heading: docx.HeadingLevel.HEADING_1
          }),
          new docx.Paragraph(ch.text)
        ]
      }]
    });
    const blob = await docx.Packer.toBlob(doc);
    folder.file(`Chuong_${num}.docx`, blob);
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
  // Reset outputs
  document.querySelectorAll(".output-box textarea").forEach(t => t.value = "");
  document.querySelectorAll(".output-box .word-count").forEach(w => w.textContent = "0 từ");
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

  const parts = splitTextIntoParts(text, currentSplit);
  parts.forEach((p, i) => {
    const out = document.getElementById(`out${i + 1}`);
    out.value = `Chương 1.${i + 1}\n\n${p.trim()}`;
    const wordCount = countWords(out.value);
    out.parentElement.querySelector(".word-count").textContent = `${wordCount} từ`;
    out.parentElement.querySelector("h4").textContent = `Chương 1.${i + 1}`;
  });

  // Clear input after split
  splitInput.value = "";
};

// Chia theo từ
function splitTextIntoParts(text, parts) {
  const words = text.split(/\s+/);
  const perPart = Math.ceil(words.length / parts);
  const result = [];
  for (let i = 0; i < parts; i++) {
    const start = i * perPart;
    const end = start + perPart;
    result.push(words.slice(start, end).join(' ').trim());
  }
  return result;
}

// Sao chép nội dung
document.addEventListener("click", e => {
  if (e.target.classList.contains("copy-btn")) {
    const id = e.target.dataset.id;
    const ta = document.getElementById(`out${id}`);
    ta.select();
    document.execCommand("copy");
    e.target.textContent = "Đã sao chép";
    e.target.classList.add("copy-success");
    setTimeout(() => {
      e.target.textContent = `Sao chép`;
      e.target.classList.remove("copy-success");
    }, 1500);
  }
});
