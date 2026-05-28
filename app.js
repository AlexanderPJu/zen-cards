console.log("🚀 VIBE CARDS: Cloud Edition Loaded 🚀");

const STORAGE_KEY = 'zen_cards_deck';
const GITHUB_TOKEN_KEY = 'zen_cards_gh_token';
const GIST_ID_KEY = 'zen_cards_gist_id';

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
    if (stored) deck = JSON.parse(stored);
} catch (e) {
    console.error("Ошибка чтения LocalStorage:", e);
}

if (!deck || deck.length === 0) {
    deck = [...defaultDeck];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
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
const speakCardBtn = document.getElementById('speakCardBtn');
const closeFormBtn = document.getElementById('closeFormBtn');
const formOverlay = document.getElementById('formOverlay');
const formTitle = document.getElementById('formTitle');
const addCardForm = document.getElementById('addCardForm');
const submitBtn = document.getElementById('submitBtn');
const radioTypes = document.getElementsByName('cardType');

const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFileInput = document.getElementById('importFileInput');

const cloudSyncBtn = document.getElementById('cloudSyncBtn');
const cloudOverlay = document.getElementById('cloudOverlay');
const closeCloudBtn = document.getElementById('closeCloudBtn');
const cloudSetupForm = document.getElementById('cloudSetupForm');
const inputGithubToken = document.getElementById('inputGithubToken');

const colors = {
    english: { primary: "#6B7B9C", shadow: "rgba(107, 123, 156, 0.15)" },
    japanese: { primary: "#578E87", shadow: "rgba(87, 142, 135, 0.15)" },
    chinese: { primary: "#C29B63", shadow: "rgba(194, 155, 99, 0.15)" },
    korean: { primary: "#B28495", shadow: "rgba(178, 132, 149, 0.15)" }
};

// ==========================================
// ЯДРО 4: Cloud Sync Engine (GitHub Gist)
// ==========================================
const CloudEngine = {
    token: localStorage.getItem(GITHUB_TOKEN_KEY),
    gistId: localStorage.getItem(GIST_ID_KEY),

    updateUIState() {
        if (this.token && this.gistId) {
            cloudSyncBtn.style.color = "var(--color-ja)"; // Зеленый = подключено
            cloudSyncBtn.title = "Cloud: Synchronized";
        } else {
            cloudSyncBtn.style.color = "var(--text-muted)"; // Серый = отключено
            cloudSyncBtn.title = "Cloud: Setup Required";
        }
    },

    async init() {
        this.updateUIState();
        if (this.token && this.gistId) {
            cloudSyncBtn.style.color = "#FFD700"; // Желтый = загрузка
            await this.fetchFromCloud();
            this.updateUIState();
        }
    },

    async setup(token) {
        this.token = token;
        localStorage.setItem(GITHUB_TOKEN_KEY, token);
        cloudSyncBtn.style.color = "#FFD700"; // Загрузка

        try {
            // Пытаемся найти существующий Gist
            const response = await fetch("https://api.github.com/gists", {
                headers: { Authorization: `token ${this.token}` }
            });
            const gists = await response.json();
            const existingGist = gists.find(g => g.files && g.files["zen_deck.json"]);

            if (existingGist) {
                // Нашли базу - подключаемся к ней и скачиваем
                this.gistId = existingGist.id;
                localStorage.setItem(GIST_ID_KEY, this.gistId);
                console.log("☁️ Облако: Найдена существующая база, загружаем...");
                await this.fetchFromCloud();
            } else {
                // Базы нет - создаем новую и пушим туда локальные данные
                console.log("☁️ Облако: База не найдена, создаем новую...");
                await this.pushToCloud(deck, true);
            }
            this.updateUIState();
            return true;
        } catch (error) {
            console.error("☁️ Ошибка настройки облака:", error);
            alert("Cloud Connection Failed. Check your token.");
            this.token = null;
            localStorage.removeItem(GITHUB_TOKEN_KEY);
            this.updateUIState();
            return false;
        }
    },

    async fetchFromCloud() {
        if (!this.token || !this.gistId) return;
        try {
            const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
                headers: { Authorization: `token ${this.token}` }
            });
            const data = await response.json();
            const content = data.files["zen_deck.json"].content;
            
            const cloudDeck = JSON.parse(content);
            if (Array.isArray(cloudDeck) && cloudDeck.length > 0) {
                deck = cloudDeck;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(deck)); // Кэшируем локально
                console.log("☁️ Облако: Данные успешно синхронизированы на устройство.");
                
                // Перезагружаем интерфейс
                currentIndex = getNextCardIndex();
                loadCard(currentIndex);
            }
        } catch (error) {
            console.error("☁️ Ошибка загрузки из облака:", error);
        }
    },

    async pushToCloud(deckData, isCreating = false) {
        if (!this.token) return;
        const body = {
            description: "Zen Cards Cloud Backup",
            public: false, // Приватный gist
            files: {
                "zen_deck.json": { content: JSON.stringify(deckData, null, 2) }
            }
        };

        try {
            const url = isCreating ? "https://api.github.com/gists" : `https://api.github.com/gists/${this.gistId}`;
            const method = isCreating ? "POST" : "PATCH";

            const response = await fetch(url, {
                method: method,
                headers: {
                    Authorization: `token ${this.token}`,
                    Accept: "application/vnd.github.v3+json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            if (isCreating && data.id) {
                this.gistId = data.id;
                localStorage.setItem(GIST_ID_KEY, this.gistId);
                console.log("☁️ Облако: Новая база успешно создана!");
            } else {
                console.log("☁️ Облако: Прогресс синхронизирован.");
            }
            this.updateUIState();
        } catch (error) {
            console.error("☁️ Ошибка отправки в облако:", error);
            cloudSyncBtn.style.color = "red"; // Ошибка
        }
    }
};

// Запуск облака
CloudEngine.init();

// Функция сохранения, которая теперь пишет И в LocalStorage И в Облако
function saveDeckToStorageAndCloud() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
    CloudEngine.pushToCloud(deck); // Асинхронно в фоне
}
// ==========================================


// ==========================================
// ЯДРО 3: Нативный Дзен Text-To-Speech
// ==========================================
const SpeechEngine = {
    voicesLoaded: false,
    langMap: {
        english: "en-US",
        japanese: "ja-JP",
        chinese: "zh-CN",
        korean: "ko-KR"
    },

    init() {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.getVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => {
                this.voicesLoaded = true;
            };
        }
    },

    speak(text, type) {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel(); 

        const utterance = new SpeechSynthesisUtterance(text);
        const targetLang = this.langMap[type] || "en-US";
        utterance.lang = targetLang;

        const voices = window.speechSynthesis.getVoices();
        let voice = voices.find(v => v.lang.startsWith(targetLang.substring(0, 2)) && v.localService);
        if (!voice) {
            voice = voices.find(v => v.lang.startsWith(targetLang.substring(0, 2)));
        }
        if (voice) utterance.voice = voice;

        utterance.rate = 0.85; 
        utterance.pitch = 0.95; 
        window.speechSynthesis.speak(utterance);
    }
};
SpeechEngine.init();


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
    
    // Пишем в оба места
    saveDeckToStorageAndCloud();
    
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
    
    document.documentElement.style.setProperty('--form-active-color', activeColor);

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
    
    // Пишем в оба места
    saveDeckToStorageAndCloud();
    
    loadCard(currentIndex);
    closeForm();
}

// Слушатели событий
cloudSyncBtn.addEventListener('click', () => {
    cloudOverlay.classList.add('active');
});

closeCloudBtn.addEventListener('click', () => {
    cloudOverlay.classList.remove('active');
});

cloudSetupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = inputGithubToken.value.trim();
    if (token) {
        const success = await CloudEngine.setup(token);
        if (success) cloudOverlay.classList.remove('active');
    }
});

cardContainer.addEventListener('click', (e) => {
    if (e.target.tagName.toLowerCase() === 'a') return; 
    flipCard();
});

editCardBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openEditForm();
});

speakCardBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const card = deck[currentIndex];
    SpeechEngine.speak(card.front, card.type);
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
radioTypes.forEach(radio => radio.addEventListener('change', updateFormTheme));
addCardForm.addEventListener('submit', handleFormSubmit);

currentIndex = getNextCardIndex();
loadCard(currentIndex);
