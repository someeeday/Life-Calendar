function changeLanguage(lang) {
    document.querySelectorAll('[data-text-' + lang + ']').forEach(element => {
        const translation = element.getAttribute('data-text-' + lang);
        if (translation && element.id !== 'lang') {
            element.textContent = translation;
        }
    });
    
    document.documentElement.lang = lang;
    saveSettings(lang, document.getElementById('theme').value, document.getElementById('birthdate').value);
    
    if (document.getElementById('birthdate').value) {
        generateLifeCalendar();
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
        // Добавляем цвета для календаря
        root.style.setProperty('--grid-color', '#333333');
        root.style.setProperty('--lived-weeks-color', '#1a73e8');
        root.style.setProperty('--future-weeks-color', '#2c2c2c');
    } else {
        root.style.setProperty('--background-color', '#ffffff');
        root.style.setProperty('--text-color', '#000000');
        root.style.setProperty('--container-background-color', '#ffffff');
        root.style.setProperty('--container-text-color', '#000000');
        root.style.setProperty('--button-background-color', '#0088cc');
        root.style.setProperty('--button-text-color', '#ffffff');
        root.style.setProperty('--canvas-border-color', '#ccc');
        // Добавляем цвета для календаря
        root.style.setProperty('--grid-color', '#e0e0e0');
        root.style.setProperty('--lived-weeks-color', '#0088cc');
        root.style.setProperty('--future-weeks-color', '#f0f0f0');
    }
    
    saveSettings(document.getElementById('lang').value, theme, document.getElementById('birthdate').value);
    
    if (document.getElementById('birthdate').value) {
        generateLifeCalendar();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    flatpickr("#birthdate", {
        dateFormat: "Y-m-d",
        maxDate: "today",
        locale: document.documentElement.lang === 'ru' ? 'ru' : 'en'
    });
    
    // Восстанавливаем настройки из куки
    const savedLang = getCookie('lang') || 
                     window.Telegram.WebApp.initDataUnsafe?.user?.language_code || 
                     (navigator.language.startsWith('ru') ? 'ru' : 'en');
    
    const savedTheme = getCookie('theme') || 
                      window.Telegram.WebApp.colorScheme || 
                      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    const savedBirthdate = getCookie('birthdate');
    
    // Применяем сохраненные настройки
    document.getElementById('lang').value = savedLang;
    document.getElementById('theme').value = savedTheme;
    if (savedBirthdate) {
        document.getElementById('birthdate').value = savedBirthdate;
    }
    
    // Применяем язык и тему
    changeLanguage(savedLang);
    applyTheme(savedTheme);
    
    // Генерируем календарь, если есть дата
    if (savedBirthdate) {
        generateLifeCalendar();
    }
});

function createLifeGrid(livedWeeks, totalYears = 90) {
    const weeksPerYear = 52;
    const canvas = document.getElementById('lifeCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Увеличенные размеры для лучшей читаемости
    const cellSize = 15;
    const padding = 80;
    const fontSize = 13;
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
    ctx.font = `${fontSize}px Arial`;
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
    ctx.fillText(labels[lang].weeks, padding, padding - 40);
    
    ctx.save();
    ctx.translate(padding - 40, padding + 20);
    ctx.rotate(-Math.PI / 2); // Поворачиваем текст на 90 градусов
    ctx.textAlign = 'center';
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
        ctx.roundRect(x, y, cellSize, cellSize, cellSize * 0.2);
        ctx.fill();
        ctx.stroke();
    }
}

// Обновляем generateLifeCalendar для работы с куками
function generateLifeCalendar() {
    const birthdate = document.getElementById('birthdate').value;
    if (!birthdate) {
        alert(document.documentElement.lang === 'ru' ? 
            'Пожалуйста, введите вашу дату рождения.' : 
            'Please enter your birth date.');
        return;
    }
    
    try {
        const formattedBirthdate = formatDate(birthdate);
        setCookie('birthdate', birthdate, 365);
        
        const birthDate = new Date(formattedBirthdate);
        const currentDate = new Date();
        
        if (birthDate > currentDate) {
            alert(document.documentElement.lang === 'ru' ? 
                'Дата рождения не может быть в будущем.' : 
                'Birth date cannot be in the future.');
            return;
        }
        
        const livedDays = Math.floor((currentDate - birthDate) / (1000 * 60 * 60 * 24));
        const livedWeeks = Math.floor(livedDays / 7);
        
        createLifeGrid(livedWeeks);
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
}

function saveSettings(lang, theme, birthdate) {
    setCookie('lang', lang, 365);
    setCookie('theme', theme, 365);
    if (birthdate) {
        setCookie('birthdate', birthdate, 365);
    }
}

function formatDate(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}