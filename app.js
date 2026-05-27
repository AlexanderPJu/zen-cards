console.log("🚀 VIBE CARDS: СКРИПТ ЗАГРУЖЕН (Версия со звуком) 🚀");

const STORAGE_KEY = 'zen_cards_deck';

const defaultDeck = [
    {
        type: "english",
        front: "Ubiquitous",
        reading: "/juːˈbɪk.wɪ.təs/",
        hint: "everywhere",
        back: "Вездесущий",
        notes: "Seeming to be everywhere. Ex: 'The mobile phone is ubiquitous.'"
    },
    {
        type: "japanese",
        front: "改善",
        reading: "かいぜん",
        hint: "Kai = change, Zen = good",
        back: "Kaizen",
        notes: "Continuous improvement. A core philosophy in Japanese business and life."
    },
    {
        type: "chinese",
        front: "你好",
        reading: "nǐ hǎo",
        hint: "literally 'you good'",
        back: "Hello",
        notes: "A standard greeting in Chinese. Literally 'you good'."
    },
    {
        type: "korean",
        front: "잘 지내요?",
        reading: "jal jinaeyo?",
        hint: "Polite state of being",
        back: "Как дела?",
        notes: "Polite way to ask 'How are you?' in Korean."
    }
];

let deck = [];
try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        deck = JSON.parse(stored);
    }
} catch (e) {
    console.error("Ошибка чтения LocalStorage:", e);
}

if (!deck || deck.length === 0) {
    deck = [...defaultDeck];
    saveDeckToStorage();
}

let currentIndex = 0;
let isEditMode = false;

const cardContainer = document.getElementById('cardContainer');
const cardElement = document.getElementById('card');
const refreshBtn = document.getElementById('refreshBtn');
const gotItBtn = document.getElementById('gotItBtn');

const elBadge = document.getElementById('cardBadge');
const elFurigana = document.getElementById('cardFurigana');
const elFrontText = document.getElementById('cardFrontText');
const elBackText = document.getElementById('cardBackText');
const elNotes = document.getElementById('cardNotes');
const elHint = document.getElementById('cardHint');

const openFormBtn = document.getElementById('openFormBtn');
const editCardBtn = document.getElementById('editCardBtn');
const closeFormBtn = document.getElementById('closeFormBtn');
const formOverlay = document.getElementById('formOverlay');
const formTitle = document.getElementById('formTitle');
const addCardForm = document.getElementById('addCardForm');
const submitBtn = document.getElementById('submitBtn');
const radioTypes = document.getElementsByName('cardType');

const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFileInput = document.getElementById('importFileInput');

const colors = {
    english: { primary: "#6B7B9C", shadow: "rgba(107, 123, 156, 0.15)" },
    japanese: { primary: "#578E87", shadow: "rgba(87, 142, 135, 0.15)" },
    chinese: { primary: "#C29B63", shadow: "rgba(194, 155, 99, 0.15)" },
    korean: { primary: "#B28495", shadow: "rgba(178, 132, 149, 0.15)" }
};

// ==========================================
// ЯДРО 2: Cyberjazz Audio Engine 
// ==========================================
const AudioEngine = {
    ctx: null,
    
    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return false;
            this.ctx = new AudioContext();
            console.log("🎵 AudioContext создан. Статус:", this.ctx.state);
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().then(() => console.log("✅ Звук разблокирован браузером!"));
        }
        return true;
    },

    play(type) {
        if (!this.init() || !this.ctx) return;
        
        console.log("🔊 Играем звук:", type);
        const t = this.ctx.currentTime;
        
        if (type === 'flip') {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(450, t);
            osc.frequency.exponentialRampToValueAtTime(80, t + 0.05);
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.4, t + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.15);
        } 
        else if (type === 'refresh') {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, t);
            osc.frequency.exponentialRampToValueAtTime(200, t + 0.3);
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.5);
        } 
        else if (type === 'gotIt') {
            const freqs = [392.00, 493.88, 587.33, 783.99]; // G4, B4, D5, G5
            const masterGain = this.ctx.createGain();
            masterGain.gain.setValueAtTime(0, t);
            masterGain.gain.linearRampToValueAtTime(0.2, t + 0.05);
            masterGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
            masterGain.connect(this.ctx.destination);

            freqs.forEach((freq, i) => {
                const osc = this.ctx.createOscillator();
                const oscGain = this.ctx.createGain();
                osc.type = 'sine';
                const noteStart = t + (i * 0.05);
                osc.frequency.setValueAtTime(freq, noteStart);
                oscGain.gain.setValueAtTime(0, noteStart);
                oscGain.gain.linearRampToValueAtTime(1 / freqs.length, noteStart + 0.02);
                oscGain.gain.exponentialRampToValueAtTime(0.01, noteStart + 1.0);
                osc.connect(oscGain);
                oscGain.connect(masterGain);
                osc.start(noteStart);
                osc.stop(noteStart + 1.5);
            });
        }
    }
};
// ==========================================

function saveDeckToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
    } catch (e) {
        console.error("Ошибка записи:", e);
    }
}

function getThemeColor(type) {
    const cssKeys = { english: 'en', japanese: 'ja', chinese: 'zh', korean: 'ko' };
    return colors[type] ? `var(--color-${cssKeys[type]})` : "var(--text-muted)";
}

function getNextCardIndex() {
    if (deck.length === 0) return 0;
    const now = Date.now();
    let dueIndices = [];
    let newIndices = [];
    deck.forEach((card, index) => {
        if (!card.nextReview) newIndices.push(index);
        else if (card.nextReview <= now) dueIndices.push(index);
    });
    if (dueIndices.length > 0) return dueIndices[Math.floor(Math.random() * dueIndices.length)];
    else if (newIndices.length > 0) return newIndices[Math.floor(Math.random() * newIndices.length)];
    else return Math.floor(Math.random() * deck.length);
}

function gradeCard(remembered) {
    if (deck.length === 0) return;
    
    if (remembered) AudioEngine.play('gotIt');
    else AudioEngine.play('refresh');

    const card = deck[currentIndex];
    const now = Date.now();
    
    if (remembered) {
        card.level = (card.level || 0) + 1;
        const intervalsInDays = [0.5, 2, 5, 14, 30, 60];
        const daysToWait = intervalsInDays[Math.min(card.level - 1, intervalsInDays.length - 1)];
        card.nextReview = now + (daysToWait * 24 * 60 * 60 * 1000);
    } else {
        card.level = 0;
        card.nextReview = now + (5 * 60 * 1000);
    }
    
    saveDeckToStorage();
    currentIndex = getNextCardIndex();
    
    if (cardElement.classList.contains('is-flipped')) {
        cardElement.classList.remove('is-flipped');
        setTimeout(() => loadCard(currentIndex), 350); 
    } else {
        loadCard(currentIndex);
    }
}

function loadCard(index) {
    if (deck.length === 0) return;
    const cardData = deck[index];
    const activeColor = getThemeColor(cardData.type);
    document.documentElement.style.setProperty('--card-glow', activeColor + '22'); 
    elBadge.textContent = cardData.type;
    elBadge.style.color = activeColor;
    elBadge.style.borderColor = activeColor + '44';
    elFurigana.textContent = cardData.reading || "";
    elFrontText.textContent = cardData.front;
    elBackText.textContent = cardData.back;
    elHint.textContent = cardData.hint || "";
    
    const rawNotes = cardData.notes || "";
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const notesWithLinks = rawNotes.replace(urlRegex, function(url) {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
    elNotes.innerHTML = notesWithLinks;
    cardElement.classList.remove('is-flipped');
}

function flipCard() {
    cardElement.classList.toggle('is-flipped');
    AudioEngine.play('flip');
}

function updateFormTheme() {
    let selectedType = 'english';
    for (const radio of radioTypes) {
        if (radio.checked) {
            selectedType = radio.value;
            break;
        }
    }
    const theme = colors[selectedType];
    document.documentElement.style.setProperty('--form-active-color', theme.primary);
    document.documentElement.style.setProperty('--form-active-color-shadow', theme.shadow);
    const readingInput = document.getElementById('inputReading');
    if (selectedType === 'english') readingInput.placeholder = "Pronunciation (Transcription)";
    else if (selectedType === 'japanese') readingInput.placeholder = "Reading (Furigana)";
    else if (selectedType === 'chinese') readingInput.placeholder = "Reading (Pinyin)";
    else if (selectedType === 'korean') readingInput.placeholder = "Reading (Romanization)";
}

function openAddForm() {
    isEditMode = false;
    formTitle.textContent = "Create Concept";
    submitBtn.textContent = "Save to Deck";
    addCardForm.reset();
    formOverlay.classList.add('active');
    updateFormTheme();
}

function openEditForm() {
    isEditMode = true;
    const card = deck[currentIndex];
    formTitle.textContent = "Edit Concept";
    submitBtn.textContent = "Update Concept";
    document.getElementById('inputFront').value = card.front;
    document.getElementById('inputReading').value = card.reading || "";
    document.getElementById('inputHint').value = card.hint || "";
    document.getElementById('inputBack').value = card.back;
    document.getElementById('inputNotes').value = card.notes || "";
    for (const radio of radioTypes) {
        if (radio.value === card.type) {
            radio.checked = true;
            break;
        }
    }
    formOverlay.classList.add('active');
    updateFormTheme();
}

function closeForm() {
    formOverlay.classList.remove('active');
    addCardForm.reset();
}

function handleFormSubmit(e) {
    e.preventDefault();
    let selectedCardType = 'english';
    for (const radio of radioTypes) {
        if (radio.checked) {
            selectedCardType = radio.value;
            break;
        }
    }
    const cardData = {
        type: selectedCardType,
        front: document.getElementById('inputFront').value.trim(),
        reading: document.getElementById('inputReading').value.trim(),
        hint: document.getElementById('inputHint').value.trim(), 
        back: document.getElementById('inputBack').value.trim(),
        notes: document.getElementById('inputNotes').value.trim()
    };

    if (isEditMode) {
        const currentCard = deck[currentIndex];
        Object.assign(currentCard, cardData);
    } else {
        cardData.level = 0;
        cardData.nextReview = null;
        deck.push(cardData);
        currentIndex = deck.length - 1;
    }
    saveDeckToStorage();
    loadCard(currentIndex);
    closeForm();
}

function exportDeck() {
    if (deck.length === 0) return;
    const dataStr = JSON.stringify(deck, null, 2); 
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'deck_export.json');
    linkElement.click();
}

function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const importedData = JSON.parse(event.target.result);
            if (Array.isArray(importedData)) {
                deck = importedData;
                saveDeckToStorage(); 
                currentIndex = getNextCardIndex();
                loadCard(currentIndex);
            } else alert("Ошибка: Неверный формат файла.");
        } catch (err) {
            alert("Ошибка чтения JSON.");
        }
    };
    reader.readAsText(file);
    importFileInput.value = '';
}

// Привязка событий
cardContainer.addEventListener('click', (e) => {
    if (e.target.tagName.toLowerCase() === 'a') return; 
    flipCard();
});

editCardBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openEditForm();
});

refreshBtn.addEventListener('click', (e) => {
    e.stopPropagation(); 
    gradeCard(false);
});

gotItBtn.addEventListener('click', (e) => {
    e.stopPropagation(); 
    gradeCard(true);
});

openFormBtn.addEventListener('click', openAddForm);
closeFormBtn.addEventListener('click', closeForm);
formOverlay.addEventListener('click', (e) => {
    if (e.target === formOverlay) closeForm();
});
exportBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exportDeck(); 
});
importBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    importFileInput.click();
});
importFileInput.addEventListener('change', handleImportFile);
radioTypes.forEach(radio => radio.addEventListener('change', updateFormTheme));
addCardForm.addEventListener('submit', handleFormSubmit);

currentIndex = getNextCardIndex();
loadCard(currentIndex);
