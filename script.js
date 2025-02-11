function changeLanguage(lang) {
    // Обновляем переводы на странице
    document.querySelectorAll('[data-text-' + lang + ']').forEach(element => {
        const translation = element.getAttribute('data-text-' + lang);
        if (translation && element.id !== 'lang') {
            element.textContent = translation;
        }
    });
    
    // Устанавливаем язык документа
    document.documentElement.lang = lang;
    
    // Сохраняем настройки без перерисовки календаря
    const currentTheme = document.getElementById('theme').value;
    const currentBirthdate = document.getElementById('birthdate').value;
    saveSettings(lang, currentTheme, currentBirthdate);
    setCookie('lang', lang, 365);
    
    // Перерисовываем календарь только если он уже был создан
    if (currentBirthdate && document.querySelector('.calendar canvas').getContext('2d')) {
        createLifeGrid(calculateLivedWeeks());
    }
}

function applyTheme(theme) {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    
    if (theme === 'dark') {
        root.style.setProperty('--background-color', '#1c1c1c');
        root.style.setProperty('--text-color', '#ffffff');
        root.style.setProperty('--container-background-color', '#2c2c2c');
        root.style.setProperty('--container-text-color', '#ffffff');
        root.style.setProperty('--button-background-color', '#0088cc');
        root.style.setProperty('--button-text-color', '#ffffff');
        root.style.setProperty('--canvas-border-color', '#444');
        root.style.setProperty('--grid-color', '#333333');
        root.style.setProperty('--lived-weeks-color', '#4285f4'); // Google Blue
        root.style.setProperty('--future-weeks-color', '#2c2c2c');
    } else {
        root.style.setProperty('--background-color', '#ffffff');
        root.style.setProperty('--text-color', '#000000');
        root.style.setProperty('--container-background-color', '#ffffff');
        root.style.setProperty('--container-text-color', '#000000');
        root.style.setProperty('--button-background-color', '#0088cc');
        root.style.setProperty('--button-text-color', '#ffffff');
        root.style.setProperty('--canvas-border-color', '#ccc');
        root.style.setProperty('--grid-color', '#e0e0e0');
        root.style.setProperty('--lived-weeks-color', '#3498db'); // Flat Blue
        root.style.setProperty('--future-weeks-color', '#f0f0f0');
    }
    
    saveSettings(document.getElementById('lang').value, theme, document.getElementById('birthdate').value);
    
    // Перерисовываем календарь с текущими неделями
    createLifeGrid(calculateLivedWeeks());
}

document.addEventListener('DOMContentLoaded', async function() {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const tg = window.Telegram?.WebApp;
    const isTelegram = tg && tg.platform !== "unknown";
    
    // Инициализация Telegram если открыто в нём
    if (isTelegram) {
        tg.ready();
        tg.expand();
        
        try {
            // Загружаем настройки из CloudStorage
            const cloudSettings = await tg.CloudStorage.getItems(['settings']);
            if (cloudSettings.settings) {
                const settings = JSON.parse(cloudSettings.settings);
                
                // Применяем настройки из CloudStorage если нет в куках
                if (settings.lang && !getCookie('lang')) {
                    document.getElementById('lang').value = settings.lang;
                    changeLanguage(settings.lang);
                }
                if (settings.theme && !getCookie('theme')) {
                    document.getElementById('theme').value = settings.theme;
                    applyTheme(settings.theme);
                }
                if (settings.birthdate && !getCookie('birthdate')) {
                    document.getElementById('birthdate').value = settings.birthdate;
                    generateLifeCalendar();
                }
            }
            
            // Запрашиваем данные пользователя
            try {
                const userDataResult = await tg.requestUser();
                if (userDataResult && !getCookie('lang')) {
                    const userLang = userDataResult.language_code?.startsWith('ru') ? 'ru' : 'en';
                    document.getElementById('lang').value = userLang;
                    changeLanguage(userLang);
                }
            } catch (error) {
                console.log('User data access denied or error');
            }
        } catch (error) {
            console.log('Error loading Telegram settings');
        }
    }

    // Инициализация выбора даты
    if (isMobile || isTelegram) {
        flatpickr("#birthdate", {
            dateFormat: "d.m.Y",
            maxDate: "today",
            locale: document.documentElement.lang === 'ru' ? 'ru' : 'en'
        });
    } else {
        const birthdateInput = document.getElementById('birthdate');
        birthdateInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 2) value = value.slice(0, 2) + '.' + value.slice(2);
            if (value.length > 5) value = value.slice(0, 5) + '.' + value.slice(5, 9);
            e.target.value = value;
        });
    }

    // Восстанавливаем настройки из всех источников с приоритетами
    const savedLang = getCookie('lang') || 
                     localStorage.getItem('lang') ||
                     (isTelegram ? tg.initDataUnsafe?.user?.language_code : null) ||
                     (navigator.language.startsWith('ru') ? 'ru' : 'en');
    
    const savedTheme = getCookie('theme') || 
                      localStorage.getItem('theme') ||
                      (isTelegram ? tg.colorScheme : null) ||
                      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    const savedBirthdate = getCookie('birthdate') || 
                          localStorage.getItem('birthdate');

    // Применяем сохраненные настройки
    if (savedLang) {
        document.getElementById('lang').value = savedLang;
        changeLanguage(savedLang);
    }

    if (savedTheme) {
        document.getElementById('theme').value = savedTheme;
        applyTheme(savedTheme);
    }

    if (savedBirthdate) {
        document.getElementById('birthdate').value = savedBirthdate;
        generateLifeCalendar();
    } else {
        createLifeGrid(); // Показываем пустой календарь по умолчанию
    }

    // Добавляем слушатели событий
    document.querySelector('form').addEventListener('submit', function(e) {
        e.preventDefault();
        generateLifeCalendar();
    });

    document.getElementById('birthdate').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            generateLifeCalendar();
        }
    });

    // Слушатель изменения размера окна
    window.addEventListener('resize', function() {
        if (document.getElementById('birthdate').value) {
            generateLifeCalendar();
        } else {
            createLifeGrid();
        }
    });
});

function createLifeGrid(livedWeeks = 0, totalYears = 91) {
    const weeksPerYear = 52;
    const canvas = document.getElementById('lifeCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Увеличенные размеры для лучшей читаемости
    const cellSize = 15;
    const padding = 80;
    const fontSize = 12;
    const cellGap = 2;

    // Настраиваем размеры canvas с учетом контейнера
    const container = canvas.parentElement;
    
    canvas.width = Math.min(container.clientWidth, weeksPerYear * cellSize + padding * 2);
    canvas.height = totalYears * cellSize + padding * 2;
    
    // Настраиваем размеры canvas с учетом контейнера и отступов
    const totalWidth = weeksPerYear * (cellSize + cellGap) + padding * 2;
    const totalHeight = totalYears * (cellSize + cellGap) + padding * 2;
    
    canvas.width = totalWidth;
    canvas.height = totalHeight;

    // Масштабирование для retina
    const scale = window.devicePixelRatio;
    canvas.width *= scale;
    canvas.height *= scale;
    ctx.scale(scale, scale);
    
    // Получаем текущую тему
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    const colors = theme === 'dark' ? {
        background: '#1c1c1c',
        text: '#ffffff',
        grid: '#333333',
        lived: '#1a73e8',
        future: '#2c2c2c'
    } : {
        background: '#ffffff',
        text: '#000000',
        grid: '#e0e0e0',
        lived: '#0088cc',
        future: '#f0f0f0'
    };
    
    // Очистка canvas
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Настройка текста
    ctx.font = `${fontSize}px Roboto`;
    ctx.fillStyle = colors.text;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    
    // Подписи с переводом
    const lang = document.documentElement.lang || 'ru';
    const labels = {
        ru: { age: '← Возраст', weeks: 'Недели года →' },
        en: { age: '← Age', weeks: 'Weeks of the Year →' }
    };
    
    // Обновляем позиции заголовков
    ctx.textAlign = 'left';
    ctx.fillText(labels[lang].weeks, padding, padding - 45);
    
    // Фиксированное позиционирование для текста возраста
    const ageTextPosition = 0; // Можно настроить это значение

    ctx.save();
    ctx.translate(padding - 45, padding + ageTextPosition);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'right';
    ctx.fillText(labels[lang].age, 0, 0);
    ctx.restore();

    // Обновляем позиции цифр для недель
    ctx.textAlign = 'center';
    let weekNumbers = [1];
    for (let i = 5; i <= 50; i += 5) {
        weekNumbers.push(i);
    }

    for (let i = 0; i < weekNumbers.length; i++) {
        const x = padding + (i * 5) * (cellSize + cellGap) - cellSize / 2;
        if (i === 0) {
            ctx.fillText(weekNumbers[i].toString(), x + (cellSize + cellGap + 15) / 2, padding - 20);
        } else {
            ctx.fillText(weekNumbers[i].toString(), x - 2, padding - 20);
        }
    }
    
    // Рисуем цифры возраста (по центру ячеек)
    ctx.textAlign = 'right';
    for (let year = 0; year <= totalYears; year += 5) {
        const y = padding + year * (cellSize + cellGap) + cellSize / 2;
        ctx.fillText(year.toString(), padding - 20, y);
    }
    
    // Рисуем сетку с отступами
    const totalWeeks = totalYears * weeksPerYear;
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 0.5;
    
    for (let week = 0; week < totalWeeks; week++) {
        const col = week % weeksPerYear;
        const row = Math.floor(week / weeksPerYear);
        
        // Вычисляем позиции с учетом отступов
        const x = padding + col * (cellSize + cellGap);
        const y = padding + row * (cellSize + cellGap);
        
        // Рисуем ячейку с закругленными углами
        ctx.fillStyle = week < livedWeeks ? colors.lived : colors.future;
        ctx.beginPath();
        ctx.roundRect(x, y, cellSize, cellSize, cellSize * 0.15);
        ctx.fill();
        ctx.stroke();
    }
}

function generateLifeCalendar() {
    const birthdate = document.getElementById('birthdate').value;
    
    if (!birthdate || !isValidDate(birthdate)) {
        alert(document.documentElement.lang === 'ru' ? 
            'Пожалуйста, введите корректную дату рождения в формате DD.MM.YYYY' : 
            'Please enter a valid birth date in DD.MM.YYYY format');
        return;
    }
    
    try {
        const formattedBirthdate = formatDate(birthdate);
        if (!formattedBirthdate) {
            throw new Error('Invalid date format');
        }
        
        const birthDate = new Date(formattedBirthdate);
        const currentDate = new Date();
        
        // Вычисляем возраст
        const ageInMilliseconds = currentDate - birthDate;
        const ageInYears = ageInMilliseconds / (1000 * 60 * 60 * 24 * 365.25);
        
        if (ageInYears > 90) {
            const confirmMessage = document.documentElement.lang === 'ru' ? 
                'Возраст превышает 90 лет. Отобразить полностью заполненный календарь?' : 
                'Age exceeds 90 years. Show fully filled calendar?';
            
            if (!confirm(confirmMessage)) {
                return;
            }
        }
        
        const livedWeeks = Math.floor(ageInMilliseconds / (1000 * 60 * 60 * 24 * 7));
        
        // Сохраняем валидную дату
        setCookie('birthdate', birthdate, 365);
        saveSettings(
            document.getElementById('lang').value,
            document.getElementById('theme').value,
            birthdate
        );
        
        // Ограничиваем максимальное количество недель
        createLifeGrid(Math.min(livedWeeks, 91 * 52));
        
    } catch (error) {
        console.error('Error generating calendar:', error);
        alert(document.documentElement.lang === 'ru' ? 
            'Ошибка при создании календаря.' : 
            'Error creating calendar.');
    }
}


// Функции для работы с куками
function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return '';
}

function saveSettings(lang, theme, birthdate) {
    setCookie('lang', lang, 365);
    setCookie('theme', theme, 365);
    if (birthdate) {
        setCookie('birthdate', birthdate, 365);
    }
}

function formatDate(date) {
    if (!date || !isValidDate(date)) return '';
    
    const parts = date.split('.');
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

function calculateLivedWeeks() {
    const birthdate = document.getElementById('birthdate').value;
    if (!birthdate || !isValidDate(birthdate)) return 0;
    
    try {
        const formattedBirthdate = formatDate(birthdate);
        const birthDate = new Date(formattedBirthdate);
        const currentDate = new Date();
        return Math.floor((currentDate - birthDate) / (1000 * 60 * 60 * 24 * 7));
    } catch (error) {
        console.error('Error calculating lived weeks:', error);
        return 0;
    }
}

function isValidDate(dateString) {
    if (!dateString) return false;
    
    const parts = dateString.split('.');
    if (parts.length !== 3) return false;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    // Проверка на числа
    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
    
    // Проверка года
    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear) return false;
    
    // Проверка месяца
    if (month < 1 || month > 12) return false;
    
    // Проверка дня с учетом високосного года
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return false;
    
    // Проверка что дата не в будущем
    const inputDate = new Date(year, month - 1, day);
    if (inputDate > new Date()) return false;
    
    return true;
}

function initializeDateInput() {
    const birthdateInput = document.getElementById('birthdate');
    
    birthdateInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.length > 8) value = value.slice(0, 8);
        
        if (value.length > 4) {
            value = value.slice(0, 2) + '.' + value.slice(2, 4) + '.' + value.slice(4);
        } else if (value.length > 2) {
            value = value.slice(0, 2) + '.' + value.slice(2);
        }
        
        e.target.value = value;
        
        // Автоматическая валидация при вводе
        if (value.length === 10) {
            if (!isValidDate(value)) {
                e.target.classList.add('error');
            } else {
                e.target.classList.remove('error');
            }
        }
    });
}

const style = document.createElement('style');
style.textContent = `
    .form-input.error {
        border-color: #ff4444;
        background-color: rgba(255, 68, 68, 0.1);
    }
`;
document.head.appendChild(style);   