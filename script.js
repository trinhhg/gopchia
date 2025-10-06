// script.js
// Tab switching
const tabGop = document.getElementById('tab-gop');
const tabChia = document.getElementById('tab-chia');
const contentGop = document.getElementById('content-gop');
const contentChia = document.getElementById('content-chia');

tabGop.addEventListener('click', () => {
    tabGop.classList.add('active');
    tabChia.classList.remove('active');
    contentGop.classList.add('active');
    contentChia.classList.remove('active');
});

tabChia.addEventListener('click', () => {
    tabChia.classList.add('active');
    tabGop.classList.remove('active');
    contentChia.classList.add('active');
    contentGop.classList.remove('active');
});

// Word count function (approximates MS Word: counts word boundaries)
function countWords(text) {
    return (text.match(/\b\w+\b/g) || []).length;
}

// Tab Gộp chương
document.getElementById('process-gop').addEventListener('click', () => {
    const input = document.getElementById('input-gop').value;
    const chapters = input.split(/(?=Chương \d+\.\d+:)/g).filter(Boolean);
    const groups = {};

    chapters.forEach(chap => {
        const match = chap.match(/Chương (\d+)\.\d+: (.*)/);
        if (match) {
            const main = match[1];
            const title = match[2].trim();
            const content = chap.replace(/Chương .*?\n/, '').trim();
            if (!groups[main]) {
                groups[main] = { titles: [], content: '' };
            }
            if (title) groups[main].titles.push(title);
            groups[main].content += content + '\n\n';
        }
    });

    const preview = document.getElementById('preview-gop');
    preview.innerHTML = '';
    window.groupedChapters = groups;

    Object.keys(groups).sort((a, b) => a - b).forEach(main => {
        const g = groups[main];
        const newTitle = `Chương ${main}: ${g.titles.join(' - ')}`;
        const fullContent = `${newTitle}\n\n${g.content.trim()}`;
        const div = document.createElement('div');
        div.innerHTML = `
            <h3>${newTitle}</h3>
            <textarea readonly>${fullContent}</textarea>
            <div>Word count: ${countWords(fullContent)} từ</div>
            <button onclick="downloadDocx('${main}', \`${escape(fullContent)}\`)">Tải DOCX</button>
        `;
        preview.appendChild(div);
    });
});

window.downloadDocx = function(chapNum, content) {
    content = unescape(content);
    const doc = new docx.Document({
        sections: [{
            properties: {},
            children: [
                new docx.Paragraph({
                    children: [new docx.TextRun(content)],
                }),
            ],
        }],
    });
    docx.Packer.toBlob(doc).then(blob => {
        saveAs(blob, `Chương ${chapNum}.docx`);
    });
};

document.getElementById('download-all-zip').addEventListener('click', () => {
    const zip = new JSZip();
    const folderName = document.getElementById('folder-name').value || 'Truyen';
    const folder = zip.folder(folderName);
    const promises = [];
    const groups = window.groupedChapters || {};

    Object.keys(groups).sort((a, b) => a - b).forEach(main => {
        const g = groups[main];
        const newTitle = `Chương ${main}: ${g.titles.join(' - ')}`;
        const fullContent = `${newTitle}\n\n${g.content.trim()}`;
        const doc = new docx.Document({
            sections: [{
                children: [new docx.Paragraph({ children: [new docx.TextRun(fullContent)] })],
            }],
        });
        promises.push(
            docx.Packer.toBlob(doc).then(blob => {
                folder.file(`Chương ${main}.docx`, blob);
            })
        );
    });

    Promise.all(promises).then(() => {
        zip.generateAsync({ type: 'blob' }).then(content => {
            saveAs(content, `${folderName}.zip`);
        });
    });
});

// Tab Chia chương
let selectedParts = 2;
document.querySelectorAll('.split-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.split-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedParts = parseInt(btn.dataset.parts);
    });
});

document.getElementById('input-chia').addEventListener('input', function() {
    document.getElementById('word-count-input').textContent = `${countWords(this.value)} từ`;
});

document.getElementById('process-chia').addEventListener('click', () => {
    const input = document.getElementById('input-chia').value.trim();
    const chapNum = document.getElementById('chapter-number').value || '1';
    const chapName = document.getElementById('chapter-name').value || '';
    const totalWords = countWords(input);
    if (totalWords === 0) return;

    const wordsPerPart = Math.floor(totalWords / selectedParts);
    const parts = [];
    let remaining = input;
    let currentWordCount = 0;

    for (let i = 1; i < selectedParts; i++) {
        const targetWords = wordsPerPart * i - currentWordCount;
        let splitPos = 0;
        let wordCount = 0;
        const regex = /\b\w+\b/g;
        let match;
        while ((match = regex.exec(remaining)) !== null && wordCount < targetWords) {
            splitPos = regex.lastIndex;
            wordCount++;
        }
        // Find nearest sentence end after splitPos
        const sentenceEnd = remaining.slice(splitPos).search(/[.!?]\s+/) + splitPos;
        if (sentenceEnd > splitPos) splitPos = sentenceEnd + 1; // Include the punctuation and space

        const part = remaining.substring(0, splitPos).trim();
        parts.push(part);
        remaining = remaining.substring(splitPos).trim();
        currentWordCount += wordCount;
    }
    parts.push(remaining);

    // Add titles and double newlines
    const titledParts = parts.map((part, idx) => {
        const title = `Chương ${chapNum}.${idx + 1}: ${chapName} (Phần ${idx + 1})`;
        return `${title}\n\n${part.replace(/\n/g, '\n\n')}`;
    });

    // Display in outputs
    for (let i = 1; i <= 10; i++) {
        const item = document.getElementById(`output-${i}`);
        if (i <= selectedParts) {
            item.style.display = 'flex';
            const ta = item.querySelector('textarea');
            ta.value = titledParts[i - 1];
            item.querySelector('.word-count').textContent = `${countWords(titledParts[i - 1])} từ`;
            item.querySelector('.copy-btn').textContent = `Sao chép ${i}`;
        } else {
            item.style.display = 'none';
        }
    }
});

// Realtime word count for output textareas
document.querySelectorAll('.output-item textarea').forEach(ta => {
    ta.addEventListener('input', function() {
        this.nextElementSibling.textContent = `${countWords(this.value)} từ`;
    });
});

// Copy buttons
document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const ta = btn.previousElementSibling.previousElementSibling; // textarea
        ta.select();
        document.execCommand('copy');
    });
});
