const STORAGE_KEY = 'zen_cards_deck';

// Дефолтная премиум-колода
const defaultDeck = [
    {
        type: "english",
        front: "Ubiquitous",
        reading: "/juːˈbɪk.wɪ.təs/",
        back: "Вездесущий",
        notes: "Seeming to be everywhere. Ex: 'The mobile phone is ubiquitous.'"
    },
    {
        type: "japanese",
        front: "改善",
        reading: "かいぜん",
        back: "Kaizen",
        notes: "Continuous improvement. A core philosophy in Japanese business and life."
    },
    {
        type: "chinese",
        front: "你好",
        reading: "nǐ hǎo",
        back: "Hello",
        notes: "A standard greeting in Chinese. Literally 'you good'."
    },
    {
        type: "korean",
        front: "잘 지내요?",
        reading: "jal jinaeyo?",
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

const cardContainer = document.getElementById('cardContainer');
const cardElement = document.getElementById('card');
const nextBtn = document.getElementById('nextBtn');

const elBadge = document.getElementById('cardBadge');
const elFurigana = document.getElementById('cardFurigana');
const elFrontText = document.getElementById('cardFrontText');
const elBackText = document.getElementById('cardBackText');
const elNotes = document.getElementById('cardNotes');

const openFormBtn = document.getElementById('openFormBtn');
const closeFormBtn = document.getElementById('closeFormBtn');
const formOverlay = document.getElementById('formOverlay');
const addCardForm = document.getElementById('addCardForm');
const radioTypes = document.getElementsByName('cardType');

// Кнопка Экспорта
const exportBtn = document.getElementById('exportBtn');

const colors = {
    english: { primary: "#6B7B9C", shadow: "rgba(107, 123, 156, 0.15)" },
    japanese: { primary: "#578E87", shadow: "rgba(87, 142, 135, 0.15)" },
    chinese: { primary: "#C29B63", shadow: "rgba(194, 155, 99, 0.15)" },
    korean: { primary: "#B28495", shadow: "rgba(178, 132, 149, 0.15)" }
};

function saveDeckToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
    } catch (e) {
        console.error("Ошибка записи в LocalStorage:", e);
    }
}

function getThemeColor(type) {
    const cssKeys = {
        english: 'en',
        japanese: 'ja',
        chinese: 'zh',
        korean: 'ko'
    };
    return colors[type] ? `var(--color-${cssKeys[type]})` : "var(--text-muted)";
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

function nextCard() {
    if (deck.length === 0) return;
    currentIndex = (currentIndex + 1) % deck.length;
    loadCard(currentIndex); 
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
    if (selectedType === 'english') {
        readingInput.placeholder = "Pronunciation (Transcription / /juːˈbɪk.wɪ.təs/)";
    } else if (selectedType === 'japanese') {
        readingInput.placeholder = "Reading (Furigana / かいぜん)";
    } else if (selectedType === 'chinese') {
        readingInput.placeholder = "Reading (Pinyin / nǐ hǎo)";
    } else if (selectedType === 'korean') {
        readingInput.placeholder = "Reading (Romanization / Pronunciation)";
    }
}

function openForm() {
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

    const newCard = {
        type: selectedCardType,
        front: document.getElementById('inputFront').value.trim(),
        reading: document.getElementById('inputReading').value.trim(),
        back: document.getElementById('inputBack').value.trim(),
        notes: document.getElementById('inputNotes').value.trim()
    };

    deck.push(newCard);
    saveDeckToStorage();
    
    currentIndex = deck.length - 1;
    loadCard(currentIndex);
    
    closeForm();
}

// Функция для выгрузки (экспорта) базы занесенных слов
function exportDeck() {
    if (deck.length === 0) return;
    
    // Форматируем JSON для красоты и легкого чтения человеком
    const dataStr = JSON.stringify(deck, null, 2); 
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    // Создаем временную ссылку на скачивание файла
    const exportFileDefaultName = 'deck_export.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    
    // Имитируем клик
    linkElement.click();
}

cardContainer.addEventListener('click', (e) => {
    if (e.target.tagName.toLowerCase() === 'a') {
        return; 
    }
    flipCard();
});

nextBtn.addEventListener('click', (e) => {
    e.stopPropagation(); 
    nextCard();
});

openFormBtn.addEventListener('click', openForm);
closeFormBtn.addEventListener('click', closeForm);
formOverlay.addEventListener('click', (e) => {
    if (e.target === formOverlay) closeForm();
});

exportBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exportDeck(); // Вызов выгрузки при нажатии ↓
});

radioTypes.forEach(radio => radio.addEventListener('change', updateFormTheme));
addCardForm.addEventListener('submit', handleFormSubmit);

loadCard(currentIndex);
