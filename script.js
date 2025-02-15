// Инициализация Telegram Web App
let tg = window.Telegram?.WebApp;

if (tg) {
    tg.expand(); // Развернуть Web App

    console.log("✅ Web App открыт в Telegram");
    console.log("🔹 initData:", tg.initData);
}

// Конфигурация переводов
const translations = {
    ru: {
        age: '← Возраст',
        weeks: 'Недели года →',
        language: 'Язык',
        theme: 'Тема',
        birthdate: 'Дата рождения',
        light: 'Светлая',
        dark: 'Тёмная',
        createCalendar: 'Создать календарь',
        datePlaceholder: 'ДД.ММ.ГГГГ',
        invalidDate: 'Введите корректную дату в формате ДД.ММ.ГГГ',
        errorCreating: 'Ошибка при создании календаря',
        confirmOldAge: 'Возраст превышает 90 лет. Отобразить полностью заполненный календарь?',
        months: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
        weekDays: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
        hiddenText: "Привет, это <a href='https://t.me/someeeday'>мой</a> сайт. Также у меня есть бот в Telegram <a id='bot-link' href='https://t.me/LifeCalendarRobot'>@LifeCalendarRobot</a>, уверен тебе понравится!",
        notFromBot: 'Приложение не из бота',
        openBot: 'Чтобы получать уведомления, откройте приложение через бота @LifeCalendarRobot'
    },
    en: {
        age: '← Age',
        weeks: 'Weeks of Year →',
        language: 'Language',
        theme: 'Theme',
        birthdate: 'Birth Date',
        light: 'Light',
        dark: 'Dark',
        createCalendar: 'Create Calendar',
        datePlaceholder: 'DD.MM.YYYY',
        invalidDate: 'Enter a valid date in DD.MM.YYYY format',
        errorCreating: 'Error creating calendar',
        confirmOldAge: 'Age exceeds 90 years. Show fully filled calendar?',
        months: ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'],
        weekDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        hiddenText: "Hello, this is <a href='https://t.me/someeeday'>my</a> website. Also check out our Telegram bot <a id='bot-link' href='https://t.me/LifeCalendarRobot'>@LifeCalendarRobot</a>, I'm sure you'll love it!",
        notFromBot: 'App not from bot',
        openBot: 'To receive notifications, open the app through @LifeCalendarRobot bot'
    }
};

// Основные цветовые схемы
const darkThemeColors = {
    background: '#0f172a',
    text: '#f1f5f9',
    grid: '#334155',
    lived: '#3b82f6',
    future: '#1e293b'
};

const lightThemeColors = {
    background: '#ffffff',
    text: '#0f172a',
    grid: '#e2e8f0',
    lived: '#2563eb', 
    future: '#f1f5f9'
};

// Получение текущей темы
function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
}

// Получение текущего языка
function getCurrentLanguage() {
    return document.documentElement.lang || 'ru';
}

// Проверка корректности даты
function isValidDate(dateString) {
    if (!dateString) return false;
    const parts = dateString.split('.');
    if (parts.length !== 3) return false;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
    if (year < 1900 || year > new Date().getFullYear()) return false;
    if (month < 1 || month > 12) return false;
    
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return false;
    
    return new Date(year, month - 1, day) <= new Date();
}

// Функция для отображения ошибки
function showError(message) {
    const errorElement = document.getElementById('birthdate-error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

// Функция для скрытия ошибки
function hideError() {
    const errorElement = document.getElementById('birthdate-error');
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

// Форматирование ввода даты
document.getElementById('birthdate-input')?.addEventListener('input', function(e) {
    hideError(); // Скрываем ошибку при вводе
    let value = e.target.value.replace(/\D/g, '');
    let formatted = '';
    
    if (value.length > 0) formatted += value.slice(0, 2);
    if (value.length > 2) {
        let month = value.slice(2, 4);
        if (month.length === 1 && month >= '2' && month <= '9') {
            month = '0' + month;
        }
        formatted += '.' + month;
    }
    if (value.length > 4) formatted += '.' + value.slice(4, 8);
    
    e.target.value = formatted;
});

// Вычисление прожитых недель
function calculateLivedWeeks(birthdate) {
    if (!birthdate || !isValidDate(birthdate)) return 0;
    
    const parts = birthdate.split('.');
    const birthDate = new Date(parts[2], parts[1] - 1, parts[0]);
    const currentDate = new Date();
    return Math.floor((currentDate - birthDate) / (1000 * 60 * 60 * 24 * 7));
}

// Отрисовка календаря жизни
function createLifeGrid(livedWeeks = 0, totalYears = 91) {
    const weeksPerYear = 52;
    const canvas = document.getElementById('lifeCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Определяем размеры для мобильных и десктопных устройств
    const isMobile = document.body.classList.contains('is-mobile');
    const cellSize = isMobile ? 12 : 15;
    const padding = isMobile ? 60 : 80;
    const fontSize = isMobile ? 11 : 12;
    const cellGap = isMobile ? 1 : 2;
    
    // Вычисляем размеры canvas
    const totalWidth = weeksPerYear * (cellSize + cellGap) + padding * 2;
    const totalHeight = totalYears * (cellSize + cellGap) + padding * 2;
    
    canvas.width = totalWidth;
    canvas.height = totalHeight;

    // Масштабирование для retina дисплеев
    const scale = window.devicePixelRatio;
    canvas.width *= scale;
    canvas.height *= scale;
    ctx.scale(scale, scale);
    
    // Получаем текущую тему
    const theme = getCurrentTheme();
    const colors = theme === 'dark' ? darkThemeColors : lightThemeColors;
    
    // Очищаем canvas
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Настраиваем шрифты и подписи
    ctx.font = `${fontSize}px Roboto`;
    ctx.fillStyle = colors.text;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    
    // Подписи для недель и возраста
    const lang = getCurrentLanguage();
    const labels = translations[lang];
    
    ctx.textAlign = 'left';
    ctx.fillText(labels.weeks, padding, padding - 45);
    
    const ageTextPosition = 0;
    ctx.save();
    ctx.translate(padding - 45, padding + ageTextPosition);
    ctx.rotate(-90 * Math.PI / 180);
    ctx.textAlign = 'right';
    ctx.fillText(labels.age, 0, 0);
    ctx.restore();

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
    
    ctx.textAlign = 'right';
    for (let year = 0; year <= totalYears; year += 5) {
        const y = padding + year * (cellSize + cellGap) + cellSize / 2;
        ctx.fillText(year.toString(), padding - 20, y);
    }
    
    // Рисуем ячейки календаря
    const totalWeeks = totalYears * weeksPerYear;
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 0.5;
    
    for (let week = 0; week < totalWeeks; week++) {
        const col = week % weeksPerYear;
        const row = Math.floor(week / weeksPerYear);
        
        const x = padding + col * (cellSize + cellGap);
        const y = padding + row * (cellSize + cellGap);
        
        ctx.fillStyle = week < livedWeeks ? colors.lived : colors.future;
        ctx.beginPath();
        // Используем метод roundRect, поддерживаемый современными браузерами
        ctx.roundRect(x, y, cellSize, cellSize, cellSize * 0.15);
        ctx.fill();
        ctx.stroke();
    }
}

// Обработчик формы
document.getElementById('settingsForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
});

// Инициализация пустого календаря
document.addEventListener('DOMContentLoaded', () => createLifeGrid(0));

// Функция смены языка
function changeLanguage(lang) {
    document.documentElement.lang = lang;
    const elements = document.querySelectorAll('[data-text-ru], [data-text-en]');
    elements.forEach(el => {
        el.textContent = el.getAttribute(`data-text-${lang}`);
    });
    
    // Обновляем плейсхолдер
    document.getElementById('birthdate-input').placeholder = translations[lang].datePlaceholder;
    
    // Обновляем текст скрытого элемента
    const hiddenText = document.getElementById('hidden-text');
    if (hiddenText) {
        hiddenText.innerHTML = translations[lang].hiddenText;
        const birthdate = document.getElementById('birthdate-input').value;
        const botLink = document.getElementById('bot-link');
        if (botLink) {
            botLink.href = isValidDate(birthdate) ? `https://t.me/LifeCalendarRobot?start=${birthdate}` : 'https://t.me/LifeCalendarRobot';
        }
    }

    // Перестраиваем календарь выбора даты
    buildCalendar();
    
    // Обновляем основной календарь жизни с текущей датой
    const birthdate = document.getElementById('birthdate-input').value;
    if (birthdate && isValidDate(birthdate)) {
        const livedWeeks = calculateLivedWeeks(birthdate);
        createLifeGrid(livedWeeks); // Перерисовываем календарь с новым языком
    } else {
        createLifeGrid(0);
    }

    // Сохраняем настройки языка
    saveSettings({ language: lang });
}

// Функция применения темы
function changeTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const colors = theme === 'dark' ? darkThemeColors : lightThemeColors;
    Object.entries(colors).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--${key}-color`, value);
    });
    // Перерисовываем календарь жизни при смене темы
    const birthdate = document.getElementById('birthdate-input').value;
    if (isValidDate(birthdate)) {
        const livedWeeks = calculateLivedWeeks(birthdate);
        createLifeGrid(livedWeeks);
    } else {
        createLifeGrid(0);
    }
    saveSettings({ theme });
}

// Инициализация темы и языка
document.addEventListener('DOMContentLoaded', () => {
    applySettings();
});

// Функция генерации календаря жизни
function generateLifeCalendar() {
    const birthdate = document.getElementById('birthdate-input').value;
    if (!isValidDate(birthdate)) {
        showError(translations[getCurrentLanguage()].invalidDate);
        return;
    }

    hideError();
    const livedWeeks = calculateLivedWeeks(birthdate);
    createLifeGrid(livedWeeks);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    saveSettings({ birthdate });

    // Если это Telegram WebApp
    if (tg) {
        sendUserData(birthdate);
    }
}

// Функция отправки данных пользователя
function sendUserData(birthdate) {
    if (tg && tg.initData) {
        const data = {
            type: "register",
            birthdate: birthdate,
            initData: tg.initData // Добавляем initData
        };

        tg.sendData(JSON.stringify(data)); // Отправляем в бота
        
        // Закрываем WebApp после отправки
        setTimeout(() => {
            tg.close();
        }, 100);
    }
}

// Функция проверки авторизации Telegram
function onTelegramAuth(user) {
    // Сохраняем данные пользователя
    localStorage.setItem('telegramUser', JSON.stringify(user));
    
    // Если мы в Telegram Web App, отправляем данные боту
    if (tg) {
        tg.sendData(JSON.stringify({
            type: 'auth',
            user: user
        }));
    }
}

// Функция для открытия и закрытия календаря
function toggleCalendar() {
    const calendar = document.getElementById('custom-calendar');
    if (calendar) {
        if (calendar.classList.contains('open')) {
            calendar.classList.remove('open');
        } else {
            const birthdateInput = document.getElementById('birthdate-input');
            if (birthdateInput.value && isValidDate(birthdateInput.value)) {
                const [day, month, year] = birthdateInput.value.split('.');
                document.getElementById('calendar-month').value = parseInt(month) - 1;
                document.getElementById('calendar-year').value = year;
                updateCalendar();
                highlightSelectedDate(birthdateInput.value);
            }
            calendar.classList.add('open');
        }
    }
}

// Обработчик для иконки открытия/закрытия календаря
document.getElementById('calendar-icon')?.addEventListener('click', toggleCalendar);

// Закрытие календаря при клике вне его области
document.addEventListener('click', function(event) {
    const calendar = document.getElementById('custom-calendar');
    const calendarIcon = document.getElementById('calendar-icon');
    if (calendar && !calendar.contains(event.target) && !calendarIcon.contains(event.target)) {
        calendar.classList.remove('open');
    }
});

// Функция для создания календаря
function buildCalendar() {
    const calendar = document.getElementById('custom-calendar');
    if (!calendar) return;

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    let calendarHtml = '<div class="calendar-header">';
    calendarHtml += '<select id="calendar-month">';
    for (let i = 0; i < 12; i++) {
        calendarHtml += `<option value="${i}">${translations[getCurrentLanguage()].months[i]}</option>`;
    }
    calendarHtml += '</select>';
    calendarHtml += '<select id="calendar-year">';
    for (let i = currentYear - 100; i <= currentYear; i++) {
        calendarHtml += `<option value="${i}">${i}</option>`;
    }
    calendarHtml += '</select>';
    calendarHtml += '</div>';

    calendarHtml += '<div class="calendar-days">';
    translations[getCurrentLanguage()].weekDays.forEach(day => {
        calendarHtml += `<div class="day-name">${day}</div>`;
    });
    calendarHtml += '</div>';

    calendarHtml += '<div class="calendar-dates"></div>';

    calendar.innerHTML = calendarHtml;

    document.getElementById('calendar-month').addEventListener('change', syncCalendarWithInput);
    document.getElementById('calendar-year').addEventListener('change', syncCalendarWithInput);

    updateCalendar();
}

// Функция для обновления календаря
function updateCalendar() {
    const calendar = document.getElementById('custom-calendar');
    const month = parseInt(document.getElementById('calendar-month').value, 10);
    const year = parseInt(document.getElementById('calendar-year').value, 10);

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Сдвигаем первый день недели на понедельник
    const adjustedFirstDay = (firstDay === 0) ? 6 : firstDay - 1;

    let datesHtml = '';
    for (let i = 0; i < adjustedFirstDay; i++) {
        datesHtml += '<div class="calendar-date empty"></div>';
    }
    for (let i = 1; i <= daysInMonth; i++) {
        datesHtml += `<div class="calendar-date" data-date="${('0' + i).slice(-2)}.${('0' + (month + 1)).slice(-2)}.${year}">${i}</div>`;
    }

    calendar.querySelector('.calendar-dates').innerHTML = datesHtml;

    // Обработчик для выбора даты
    document.querySelectorAll('.calendar-date').forEach(dateElement => {
        dateElement.addEventListener('click', function() {
            if (!dateElement.classList.contains('empty')) {
                const selectedDate = dateElement.getAttribute('data-date');
                document.getElementById('birthdate-input').value = selectedDate;
                highlightSelectedDate(selectedDate);
            }
        });
    });
}

// Функция для выделения выбранной даты
function highlightSelectedDate(date) {
    document.querySelectorAll('.calendar-date').forEach(dateElement => {
        if (dateElement.getAttribute('data-date') === date) {
            dateElement.classList.add('highlight');
        } else {
            dateElement.classList.remove('highlight');
        }
    });
}

// Синхронизация календаря с полем ввода даты
document.getElementById('birthdate-input')?.addEventListener('change', function(e) {
    const value = e.target.value;
    if (isValidDate(value)) {
        const parts = value.split('.');
        const year = parseInt(parts[2], 10);
        const month = parseInt(parts[1], 10) - 1;
        document.getElementById('calendar-month').value = month;
        document.getElementById('calendar-year').value = year;
        updateCalendar();
        highlightSelectedDate(value);
    }
    const botLink = document.getElementById('bot-link');
    if (botLink) {
        botLink.href = isValidDate(value) ? `https://t.me/LifeCalendarRobot?start=${value}` : 'https://t.me/LifeCalendarRobot';
    }
});

// Синхронизация календаря с полем ввода даты при изменении месяца или года
function syncCalendarWithInput() {
    const month = document.getElementById('calendar-month').value;
    const year = document.getElementById('calendar-year').value;
    const birthdateInput = document.getElementById('birthdate-input');
    
    if (birthdateInput.value && isValidDate(birthdateInput.value)) {
        const [day] = birthdateInput.value.split('.');
        const newDate = `${day}.${String(parseInt(month) + 1).padStart(2, '0')}.${year}`;
        if (isValidDate(newDate)) {
            birthdateInput.value = newDate;
            updateCalendar();
            highlightSelectedDate(newDate);
        }
    }
}

// Синхронизация календаря с текущей датой
document.addEventListener('DOMContentLoaded', function() {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    document.getElementById('calendar-month').value = month;
    document.getElementById('calendar-year').value = year;
    updateCalendar();
});

// Инициализация календаря
document.addEventListener('DOMContentLoaded', buildCalendar);

// Функция для открытия скрытого элемента и прокрутки страницы до конца
function toggleHiddenContent() {
    const hiddenContent = document.getElementById('hidden-content');
    const hiddenText = document.getElementById('hidden-text');
    if (hiddenContent && hiddenText) {
        hiddenContent.style.display = hiddenContent.style.display === 'none' ? 'block' : 'none';
        hiddenText.innerHTML = translations[getCurrentLanguage()].hiddenText;
        const birthdate = document.getElementById('birthdate-input').value;
        const botLink = document.getElementById('bot-link');
        if (botLink) {
            botLink.href = isValidDate(birthdate) ? `https://t.me/LifeCalendarRobot?start=${birthdate}` : 'https://t.me/LifeCalendarRobot';
        }
        if (hiddenContent.style.display === 'block') {
            hiddenContent.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

// Функция сохранения настроек
function saveSettings(settings) {
    const currentSettings = loadSettings(); // Загружаем текущие настройки
    const updatedSettings = { ...currentSettings, ...settings }; // Объединяем с новыми
    Object.entries(updatedSettings).forEach(([key, value]) => {
        localStorage.setItem(key, value);
    });
}

// Функция загрузки настроек
function loadSettings() {
    return {
        theme: localStorage.getItem('theme') || 'light',
        language: localStorage.getItem('language') || 'ru',
        birthdate: localStorage.getItem('birthdate') || ''
    };
}

// Функция применения сохранённых настроек
function applySettings() {
    const settings = loadSettings();
    
    // Применяем тему
    document.getElementById('theme-select').value = settings.theme;
    changeTheme(settings.theme);
    
    // Применяем язык
    document.getElementById('lang-select').value = settings.language;
    changeLanguage(settings.language);
    
    // Применяем дату рождения
    const birthdateInput = document.getElementById('birthdate-input');
    if (birthdateInput && settings.birthdate) {
        birthdateInput.value = settings.birthdate;
        if (isValidDate(settings.birthdate)) {
            generateLifeCalendar();
        }
    }
}

// Добавляем вызов применения настроек при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    applySettings();
});

// При загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    // Инициализируем Telegram WebApp
    if (tg) {
        tg.ready();
        // Настраиваем обработку ошибок
        tg.onEvent('error', function(error) {
            console.error('WebApp error:', error);
        });
    }
});