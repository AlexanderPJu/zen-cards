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

const cardContainer = document.getElementById('cardContainer');
const cardElement = document.getElementById('card');

// Новые кнопки
const refreshBtn = document.getElementById('refreshBtn');
const gotItBtn = document.getElementById('gotItBtn');

const elBadge = document.getElementById('cardBadge');
const elFurigana = document.getElementById('cardFurigana');
const elFrontText = document.getElementById('cardFrontText');
const elBackText = document.getElementById('cardBackText');
const elNotes = document.getElementById('cardNotes');
const elHint = document.getElementById('cardHint');

const openFormBtn = document.getElementById('openFormBtn');
const closeFormBtn = document.getElementById('closeFormBtn');
const formOverlay = document.getElementById('formOverlay');
const addCardForm = document.getElementById('addCardForm');
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

function saveDeckToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
    } catch (e) {
        console.error("Ошибка записи в LocalStorage:", e);
    }
}

function getThemeColor(type) {
    const cssKeys = { english: 'en', japanese: 'ja', chinese: 'zh', korean: 'ko' };
    return colors[type] ? `var(--color-${cssKeys[type]})` : "var(--text-muted)";
}

// === ЯДРО: Smooth Mode Spaced Repetition ===
function getNextCardIndex() {
    if (deck.length === 0) return 0;

    const now = Date.now();
    let dueIndices = [];
    let newIndices = [];

    // Lazy Evaluation: сканируем колоду на лету
    deck.forEach((card, index) => {
        if (!card.nextReview) {
            newIndices.push(index); // Новые карточки
        } else if (card.nextReview <= now) {
            dueIndices.push(index); // Пора повторить
        }
    });

    // 1. Приоритет карточкам, которые подошло время повторить (выбираем случайно для разнообразия)
    if (dueIndices.length > 0) {
        return dueIndices[Math.floor(Math.random() * dueIndices.length)];
    } 
    // 2. Если долгов нет, берем новые слова
    else if (newIndices.length > 0) {
        return newIndices[Math.floor(Math.random() * newIndices.length)];
    } 
    // 3. Playful Exploration: всё выучено. Просто берем любую случайную карту из всей колоды
    else {
        return Math.floor(Math.random() * deck.length);
    }
}

function gradeCard(remembered) {
    if (deck.length === 0) return;
    
    const card = deck[currentIndex];
    const now = Date.now();

    if (remembered) {
        // Успех: повышаем уровень и отодвигаем в будущее
        card.level = (card.level || 0) + 1;
        // Мягкие интервалы: 12ч, 2д, 5д, 14д, 30д, 2 мес+
        const intervalsInDays = [0.5, 2, 5, 14, 30, 60];
        const daysToWait = intervalsInDays[Math.min(card.level - 1, intervalsInDays.length - 1)];
        card.nextReview = now + (daysToWait * 24 * 60 * 60 * 1000);
    } else {
        // Ошибка (Refresh): сбрасываем прогресс, показываем снова очень скоро
        card.level = 0;
        card.nextReview = now + (5 * 60 * 1000); // через 5 минут
    }

    saveDeckToStorage();

    // Вычисляем следующую карту по алгоритму
    currentIndex = getNextCardIndex();

    // Бесшовная анимация перехода
    if (cardElement.classList.contains('is-flipped')) {
        cardElement.classList.remove('is-flipped');
        setTimeout(() => loadCard(currentIndex), 350); 
    } else {
        loadCard(currentIndex);
    }
}
// ==========================================

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
        hint: document.getElementById('inputHint').value.trim(), 
        back: document.getElementById('inputBack').value.trim(),
        notes: document.getElementById('inputNotes').value.trim(),
        level: 0, // Инициализация параметров алгоритма
        nextReview: null
    };

    deck.push(newCard);
    saveDeckToStorage();
    
    currentIndex = deck.length - 1;
    loadCard(currentIndex);
    closeForm();
}

function exportDeck() {
    if (deck.length === 0) return;
    const dataStr = JSON.stringify(deck, null, 2); 
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'deck_export.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
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
                // При импорте пересчитываем алгоритм
                currentIndex = getNextCardIndex();
                loadCard(currentIndex);
            } else {
                alert("Ошибка: Неверный формат файла. Ожидался массив карточек.");
            }
        } catch (err) {
            alert("Ошибка чтения JSON файла.");
            console.error(err);
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

// Слушатели для алгоритмических кнопок
refreshBtn.addEventListener('click', (e) => {
    e.stopPropagation(); 
    gradeCard(false); // Забыл
});

gotItBtn.addEventListener('click', (e) => {
    e.stopPropagation(); 
    gradeCard(true); // Вспомнил
});

openFormBtn.addEventListener('click', openForm);
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

// Запуск с вычисления правильной карты
currentIndex = getNextCardIndex();
loadCard(currentIndex);
