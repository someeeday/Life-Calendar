// Функция смены языка
function changeLanguage(lang) {
    // Обновляем переводы на странице
    document.querySelectorAll('[data-text-' + lang + ']').forEach(element => {
        const translation = element.getAttribute('data-text-' + lang);
        if (translation && element.id !== 'lang-select') {
            element.textContent = translation;
        }
    });
    
    // Обновляем placeholder для даты в зависимости от языка
    const birthdateInput = document.getElementById('birthdate-input');
    if (birthdateInput) {
        birthdateInput.placeholder = lang === 'ru' ? 'ДД.ММ.ГГГГ' : 'DD.MM.YYYY';
        // Убираем обновление flatpickr, так как он больше не используется
    }
    
    // Устанавливаем язык документа
    document.documentElement.lang = lang;
    
    // Сохраняем настройки
    const currentTheme = document.getElementById('theme-select').value;
    const currentBirthdate = document.getElementById('birthdate-input').value;
    saveSettings(lang, currentTheme, currentBirthdate);
    
    // Генерируем событие смены языка
    document.dispatchEvent(new Event('languageChanged'));
    
    // Перерисовываем календарь если он уже был создан
    if (currentBirthdate && document.querySelector('.calendar canvas') && document.querySelector('.calendar canvas').getContext('2d')) {
        createLifeGrid(calculateLivedWeeks());
    }
}

// Функция смены темы
function applyTheme(theme) {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    
    if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        root.style.setProperty('--background-color', tg.backgroundColor);
        root.style.setProperty('--text-color', tg.textColor);
    } else {
        if (theme === 'dark') {
            root.style.setProperty('--background-color', '#1c1c1c');
            root.style.setProperty('--text-color', '#ffffff');
            root.style.setProperty('--container-background-color', '#2c2c2c');
            root.style.setProperty('--container-text-color', '#ffffff');
            root.style.setProperty('--button-background-color', '#0088cc');
            root.style.setProperty('--button-text-color', '#ffffff');
            root.style.setProperty('--canvas-border-color', '#444');
            root.style.setProperty('--grid-color', '#333333');
            root.style.setProperty('--lived-weeks-color', '#4285f4');
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
            root.style.setProperty('--lived-weeks-color', '#3498db');
            root.style.setProperty('--future-weeks-color', '#f0f0f0');
        }
    }
    
    // Сохраняем настройки
    saveSettings(
        document.getElementById('lang-select').value,
        theme,
        document.getElementById('birthdate-input').value
    );

    // Перерисовываем календарь
    createLifeGrid(calculateLivedWeeks());
}

// Основная инициализация
document.addEventListener('DOMContentLoaded', async function() {
    initializeDatePicker();
    const tg = window.Telegram?.WebApp;
    
    // Корректное определение Telegram Web App
    const isTelegram = Boolean(
        tg && 
        tg.platform !== "unknown" && 
        tg.initDataUnsafe?.user && // проверяем наличие данных пользователя
        window.navigator.userAgent.includes('TelegramWebApp')
    );
    
    // Определение мобильного устройства без привязки к размеру окна
    const isMobile = /iPhone|iPad|iPod|Android|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Отладочная информация
    console.log('Environment Debug:', {
        isTelegram,
        isMobile,
        platform: {
            telegram: tg?.platform || 'unknown',
            browser: navigator.platform,
            webView: window.navigator.userAgent.includes('TelegramWebApp') ? 'Telegram' : 'Browser'
        },
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight
        },
        initData: tg?.initDataUnsafe?.user ? 'authorized' : 'unauthorized',
        url: window.location.href
    });

    // Применяем классы и инициализируем интерфейс
    document.body.classList.toggle('is-mobile', isMobile);
    document.body.classList.toggle('is-telegram', isTelegram);

    if (isTelegram) {
        try {
            await tg.ready();
            tg.expand();
            
            // Настраиваем кнопку Telegram
            tg.MainButton.setParams({
                text: document.documentElement.lang === 'ru' ? 'Создать календарь' : 'Create calendar',
                color: '#0088cc',
                text_color: '#ffffff',
                is_active: true,
                is_visible: true
            });
            tg.MainButton.onClick(generateLifeCalendar);
            tg.MainButton.show();
        } catch (error) {
            console.error('Telegram initialization failed:', error);
            document.body.classList.remove('is-telegram');
        }

        try {
            // Загружаем настройки из CloudStorage
            const cloudSettings = await tg.CloudStorage.getItems(['settings']);
            if (cloudSettings.settings) {
                const settings = JSON.parse(cloudSettings.settings);
                
                // Применяем настройки из CloudStorage если нет в куках
                if (settings.lang && !getCookie('lang-select')) {
                    document.getElementById('lang-select').value = settings.lang;
                    changeLanguage(settings.lang);
                }
                if (settings.theme && !getCookie('theme-select')) {
                    document.getElementById('theme-select').value = settings.theme;
                    applyTheme(settings.theme);
                }
                if (settings.birthdate && !getCookie('birthdate-input')) {
                    document.getElementById('birthdate-input').value = settings.birthdate;
                    generateLifeCalendar();
                }
            }
            
            // Запрашиваем данные пользователя
            try {
                const userDataResult = await tg.requestUser();
                if (userDataResult && !getCookie('lang-select')) {
                    const userLang = userDataResult.language_code?.startsWith('ru') ? 'ru' : 'en';
                    document.getElementById('lang-select').value = userLang;
                    changeLanguage(userLang);
                }
            } catch (error) {
                console.log('User data access denied or error');
            }
        } catch (error) {
            console.log('Error loading Telegram settings');
        }
    }

    // Для десктопных устройств (не мобильных) добавляем событие на изменение поля даты
    if (!isMobile) {
        const birthdateInput = document.getElementById('birthdate-input');
        birthdateInput.addEventListener('change', function() {
            generateLifeCalendar();
        });
    }

    // Восстанавливаем настройки из всех источников с приоритетами
    const savedLang = getCookie('lang-select') || 
                     localStorage.getItem('lang-select') ||
                     (tg?.initDataUnsafe?.user?.language_code?.startsWith('ru') ? 'ru' : 'en') ||
                     (navigator.language.startsWith('ru') ? 'ru' : 'en');
    
    const savedTheme = getCookie('theme-select') || 
                      localStorage.getItem('theme-select') ||
                      (tg ? tg.colorScheme : null) ||
                      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    const savedBirthdate = getCookie('birthdate-input') || 
                          localStorage.getItem('birthdate-input');

    if (savedLang) {
        document.getElementById('lang-select').value = savedLang;
        changeLanguage(savedLang);
    }

    if (savedTheme) {
        document.getElementById('theme-select').value = savedTheme;
        applyTheme(savedTheme);
    }

    if (savedBirthdate) {
        document.getElementById('birthdate-input').value = savedBirthdate;
        generateLifeCalendar();
    } else {
        createLifeGrid();
    }

    // Добавляем слушатели событий формы
    document.querySelector('form').addEventListener('submit', function(e) {
        e.preventDefault();
        generateLifeCalendar();
    });

    document.getElementById('birthdate-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            generateLifeCalendar();
        }
    });

    window.addEventListener('resize', debounce(function() {
        if (document.getElementById('birthdate-input').value) {
            generateLifeCalendar();
        } else {
            createLifeGrid();
        }
    }, 250));
});

// Функция отрисовки календаря жизни
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
    
    // Очищаем canvas
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Настраиваем шрифты и подписи
    ctx.font = `${fontSize}px Roboto`;
    ctx.fillStyle = colors.text;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    
    // Подписи для недель и возраста
    const lang = document.documentElement.lang || 'ru';
    const labels = {
        ru: { age: '← Возраст', weeks: 'Недели года →' },
        en: { age: '← Age', weeks: 'Weeks of the Year →' }
    };
    
    ctx.textAlign = 'left';
    ctx.fillText(labels[lang].weeks, padding, padding - 45);
    
    const ageTextPosition = 0;
    ctx.save();
    ctx.translate(padding - 45, padding + ageTextPosition);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'right';
    ctx.fillText(labels[lang].age, 0, 0);
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

// Генерация календаря жизни по введённой дате
function generateLifeCalendar() {
    const birthdateInput = document.getElementById('birthdate-input');
    if (!birthdateInput) {
        console.error('Birthdate input not found');
        return;
    }
    
    const birthdate = birthdateInput.value;
    
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
        
        // Сохраняем дату
        setCookie('birthdate-input', birthdate, 365);
        saveSettings(
            document.getElementById('lang-select').value,
            document.getElementById('theme-select').value,
            birthdate
        );
        
        createLifeGrid(Math.min(livedWeeks, 91 * 52));
        
    } catch (error) {
        console.error('Error generating calendar:', error);
        alert(document.documentElement.lang === 'ru' ? 
            'Ошибка при создании календаря.' : 
            'Error creating calendar.');
    }
}

// Работа с куками
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
    try {
        setCookie('lang-select', lang, 365);
        setCookie('theme-select', theme, 365);
        if (birthdate) {
            setCookie('birthdate-input', birthdate, 365);
        }
        localStorage.setItem('lang-select', lang);
        localStorage.setItem('theme-select', theme);
        if (birthdate) {
            localStorage.setItem('birthdate-input', birthdate);
        }
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

// Преобразование даты: из DD.MM.YYYY в ISO (YYYY-MM-DD)
function formatDate(dateString) {
    if (!dateString) return '';
    // Если значение в ISO формате (YYYY-MM-DD), возвращаем как есть
    if (dateString.includes('-')) {
        return dateString;
    }
    // Ожидаем формат DD.MM.YYYY
    const parts = dateString.split('.');
    if (parts.length !== 3) return '';
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
}

// Вычисление количества прожитых недель
function calculateLivedWeeks() {
    const birthdate = document.getElementById('birthdate-input').value;
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

// Проверка корректности даты
function isValidDate(dateString) {
    if (!dateString) return false;
    let date;
    if (dateString.includes('.')) {
        const parts = dateString.split('.');
        if (parts.length !== 3) return false;
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
        if (year < 1900 || year > new Date().getFullYear()) return false;
        const daysInMonth = new Date(year, month, 0).getDate();
        if (day < 1 || day > daysInMonth) return false;
        date = new Date(year, month - 1, day);
    } else if (dateString.includes('-')) {
        date = new Date(dateString);
        if (isNaN(date)) return false;
    } else {
        return false;
    }
    if (date > new Date()) return false;
    return true;
}

function hideCalendarIfNotHovered() {
    const calendar = document.getElementById('custom-calendar');
    const container = document.querySelector('.date-input-container');
    if (!calendar || !container) return;
    if (!calendar.matches(':hover') && !container.matches(':hover')) {
        hideCustomCalendar();
    }
}

// Инициализация выбора даты
function initializeDatePicker() {
    const birthdateInput = document.getElementById('birthdate-input');
    const lang = document.documentElement.lang || 'ru';
    birthdateInput.type = "text";
    birthdateInput.placeholder = lang === 'ru' ? 'ДД.ММ.ГГГГ' : 'DD.MM.YYYY';

    let errorElem = document.getElementById('birthdate-error');
    if (!errorElem) {
        errorElem = document.createElement('div');
        errorElem.id = 'birthdate-error';
        errorElem.style.color = '#ff4444';
        errorElem.style.fontSize = '12px';
        errorElem.style.marginTop = '4px';
        birthdateInput.parentNode.appendChild(errorElem);
    }

    birthdateInput.addEventListener('input', formatBirthdateInput);

    birthdateInput.addEventListener('blur', function(e) {
        if (e.target.value && !isValidDate(e.target.value)) {
            errorElem.textContent = lang === 'ru'
                ? 'Введите корректную дату в формате ДД.ММ.ГГГГ'
                : 'Enter a valid date in DD.MM.YYYY format';
            e.target.classList.add('error');
        } else {
            errorElem.textContent = '';
            e.target.classList.remove('error');
        }
    });

    // Показываем календарь при фокусе
    birthdateInput.addEventListener('focus', function() {
        showCustomCalendar(birthdateInput);
    });

    // Открываем календарь при наведении на контейнер ввода
    const dateContainer = document.querySelector('.date-input-container');
    if (dateContainer) {
        dateContainer.addEventListener('mouseenter', function() {
            showCustomCalendar(birthdateInput);
        });
        dateContainer.addEventListener('mouseleave', hideCalendarIfNotHovered);
    }

    // Если клик вне календаря и поля – скрываем календарь
    document.addEventListener('click', function(event) {
        const calendar = document.getElementById('custom-calendar');
        if (calendar && !calendar.contains(event.target) && event.target !== birthdateInput) {
            hideCustomCalendar();
        }
    });
}

// Добавляем небольшой стиль для индикации ошибки в поле ввода
const style = document.createElement('style');
style.textContent = `
    .form-input.error {
        border-color: #ff4444;
        background-color: rgba(255, 68, 68, 0.1);
    }
`;
document.head.appendChild(style);

// Функция debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Функция показа кастомного календаря под элементом ввода
function showCustomCalendar(birthdateInput) {
    let calendar = document.getElementById('custom-calendar');
    if (!calendar) {
        calendar = document.createElement('div');
        calendar.id = 'custom-calendar';
        calendar.className = 'custom-calendar';
        calendar.innerHTML = `
            <div class="calendar-header">
                <select id="calendar-month-select"></select>
                <select id="calendar-year-select"></select>
            </div>
            <div class="calendar-days"></div>
            <div class="calendar-dates"></div>
        `;
        // Добавляем календарь после контейнера поля ввода
        birthdateInput.parentNode.insertAdjacentElement('afterend', calendar);

        // При наведении на календарь он остаётся открытым
        calendar.addEventListener('mouseenter', function() {
            // пустой обработчик
        });
        calendar.addEventListener('mouseleave', hideCalendarIfNotHovered);

        // Заполняем заголовок (названия дней недели)
        const dayNames = document.documentElement.lang === 'ru'
            ? ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
            : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const daysContainer = calendar.querySelector('.calendar-days');
        daysContainer.innerHTML = dayNames.map(day => `<div class="day-name">${day}</div>`).join('');

        // Обработчики изменения селектов месяца и года
        const monthSelect = calendar.querySelector('#calendar-month-select');
        const yearSelect = calendar.querySelector('#calendar-year-select');
        monthSelect.addEventListener('change', function() {
            updateCalendarDates(calendar, parseInt(yearSelect.value, 10), parseInt(monthSelect.value, 10));
            updateCalendarHighlight(birthdateInput, calendar);
        });
        yearSelect.addEventListener('change', function() {
            updateCalendarDates(calendar, parseInt(yearSelect.value, 10), parseInt(monthSelect.value, 10));
            updateCalendarHighlight(birthdateInput, calendar);
        });
    }

    let currentDate = new Date();
    if (isValidDate(birthdateInput.value)) {
        currentDate = new Date(formatDate(birthdateInput.value));
    }
    populateSelectors(calendar, currentDate.getFullYear(), currentDate.getMonth());
    updateCalendarDates(calendar, currentDate.getFullYear(), currentDate.getMonth());
    updateCalendarHighlight(birthdateInput, calendar);

    // Показываем календарь
    calendar.style.display = 'block';
    requestAnimationFrame(() => {
        calendar.classList.add('open');
    });
}

// Функция скрытия календаря
function hideCustomCalendar() {
    const calendar = document.getElementById('custom-calendar');
    if (calendar) {
        calendar.classList.remove('open');
        setTimeout(() => {
            calendar.style.display = 'none';
        }, 300);
    }
}
// Построение календаря для указанного месяца/года
function buildCalendar(calendar, date, inputElement) {
    const selectedMonth = date.getMonth();
    const selectedYear = date.getFullYear();

    // Строим заголовок с селектами для месяца и года
    let headerHtml = '<div class="calendar-header">';
    headerHtml += '<select id="calendar-month-select"></select>';
    headerHtml += '<select id="calendar-year-select"></select>';
    headerHtml += '</div>';

    // Заголовок с названиями дней недели
    const dayNames = document.documentElement.lang === 'ru'
        ? ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']
        : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    let daysHtml = '<div class="calendar-days">';
    for (let d of dayNames) {
        daysHtml += `<div class="day-name">${d}</div>`;
    }
    daysHtml += '</div>';

    // Сетка дат
    let datesHtml = '<div class="calendar-dates">';
    // Определяем первый день месяца
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const startingDay = firstDay.getDay(); // 0–6
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    // Пустые ячейки до первого дня месяца
    for (let i = 0; i < startingDay; i++) {
        datesHtml += '<div class="calendar-date empty"></div>';
    }
    // Дни месяца
    for (let d = 1; d <= daysInMonth; d++) {
        datesHtml += `<div class="calendar-date" data-day="${d}">${d}</div>`;
    }
    datesHtml += '</div>';

    calendar.innerHTML = headerHtml + daysHtml + datesHtml;

    // Заполняем селект месяца
    const monthSelect = calendar.querySelector('#calendar-month-select');
    for (let m = 0; m < 12; m++) {
        const option = document.createElement('option');
        option.value = m;
        option.textContent = getMonthName(m);
        if (m === selectedMonth) { option.selected = true; }
        monthSelect.appendChild(option);
    }
    // Заполняем селект года (от 1900 до текущего года)
    const yearSelect = calendar.querySelector('#calendar-year-select');
    const currentYear = new Date().getFullYear();
    for (let y = 1900; y <= currentYear; y++) {
        const option = document.createElement('option');
        option.value = y;
        option.textContent = y;
        if (y === selectedYear) { option.selected = true; }
        yearSelect.appendChild(option);
    }
    // При изменении месяца/года пересоздаём календарь с новым выбором
    monthSelect.addEventListener('change', function(e) {
        const newMonth = parseInt(e.target.value, 10);
        const newYear = parseInt(yearSelect.value, 10);
        const newDate = new Date(newYear, newMonth, 1);
        buildCalendar(calendar, newDate, inputElement);
        updateCalendarHighlight(inputElement, calendar);
    });
    yearSelect.addEventListener('change', function(e) {
        const newYear = parseInt(e.target.value, 10);
        const newMonth = parseInt(monthSelect.value, 10);
        const newDate = new Date(newYear, newMonth, 1);
        buildCalendar(calendar, newDate, inputElement);
        updateCalendarHighlight(inputElement, calendar);
    });

    // Добавляем обработку выбора дня
    const dateCells = calendar.querySelectorAll('.calendar-date:not(.empty)');
    dateCells.forEach(cell => {
        cell.addEventListener('click', function(e) {
            e.stopPropagation();
            const selectedDay = parseInt(this.getAttribute('data-day'), 10);
            const newYear = parseInt(yearSelect.value, 10);
            const newMonth = parseInt(monthSelect.value, 10);
            const constructedDate = new Date(newYear, newMonth, selectedDay);
            inputElement.value = formatCustomDate(constructedDate);
            hideCustomCalendar();
            generateLifeCalendar();
        });
    });

    // После построения выделяем выбранный день (если введён в поле)
    updateCalendarHighlight(inputElement, calendar);
}

// Возвращает название месяца для выбранного языка
function getMonthName(monthIndex) {
    const lang = document.documentElement.lang || 'ru';
    const months = lang === 'ru'
        ? ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
        : ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return months[monthIndex];
}

// Форматирует дату в строку dd.mm.yyyy
function formatCustomDate(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

function updateCalendarHighlight(inputElement, calendar) {
    // Снимаем ранее выделенные ячейки
    calendar.querySelectorAll('.calendar-date.highlight').forEach(cell => {
        cell.classList.remove('highlight');
    });
    if (!inputElement.value) return;
    const parts = inputElement.value.split('.');
    
    // Выделяем ячейку дня, если введено 2 цифры
    if (parts[0] && parts[0].length === 2) {
        const dayNumber = parseInt(parts[0], 10);
        if (!isNaN(dayNumber)) {
            const cell = calendar.querySelector(`.calendar-date[data-day="${dayNumber}"]`);
            if (cell) cell.classList.add('highlight');
        }
    }
    
    // Обновляем селектор месяца без перестройки календаря
    const monthSelect = calendar.querySelector('#calendar-month-select');
    if (parts[1] && parts[1].length === 2) {
        const monthNumber = parseInt(parts[1], 10);
        if (!isNaN(monthNumber) && monthNumber >= 1 && monthNumber <= 12 && monthSelect) {
            monthSelect.value = monthNumber - 1;
        }
    }
    
    // Обновляем селектор года без перестройки календаря
    const yearSelect = calendar.querySelector('#calendar-year-select');
    if (parts[2] && parts[2].length === 4 && yearSelect) {
        const yearNumber = parseInt(parts[2], 10);
        if (!isNaN(yearNumber)) {
            yearSelect.value = yearNumber;
        }
    }
}

// Заполняет селекторы месяца и года (год – от 1900 до текущего года)
function populateSelectors(calendar, selectedYear, selectedMonth) {
    const monthSelect = calendar.querySelector('#calendar-month-select');
    const yearSelect = calendar.querySelector('#calendar-year-select');
    // Заполняем месяц, если ещё не заполнен или требуется обновление
    if (!monthSelect.childElementCount) {
        for (let m = 0; m < 12; m++) {
            const option = document.createElement('option');
            option.value = m;
            option.textContent = getMonthName(m);
            monthSelect.appendChild(option);
        }
    }
    monthSelect.value = selectedMonth;

    // Заполняем год
    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = '';
    for (let y = 1900; y <= currentYear; y++) {
        const option = document.createElement('option');
        option.value = y;
        option.textContent = y;
        yearSelect.appendChild(option);
    }
    yearSelect.value = selectedYear;
}

function formatBirthdateInput(e) {
    const input = e.target;
    // Оставляем только цифры и ограничиваем до 8 символов (ДДММГГГГ)
    let digits = input.value.replace(/\D/g, '');
    if (digits.length > 8) digits = digits.slice(0, 8);

    let formatted = '';
    const day = digits.slice(0, 2);
    let month = digits.slice(2, 4);
    const year = digits.slice(4, 8);

    // Добавляем день
    formatted += day;

    // Если есть хотя бы одна цифра для месяца – добавляем разделитель
    if (digits.length > 2) {
        formatted += '.';

        // Если введена только одна цифра для месяца и это не операция удаления
        if (month.length === 1 && (!e.inputType || !e.inputType.startsWith('delete'))) {
            if (month === "0") {
                // Если введён "0", оставляем как есть
            } else if (parseInt(month, 10) >= 2 && parseInt(month, 10) <= 9) {
                // Если введена цифра от 2 до 9, дополняем ведущим нулём
                month = '0' + month;
            }
            // Если цифра равна "1", оставляем для возможности ввода 10-12
        }
        formatted += month;
    }

    // Если есть цифры для года – добавляем разделитель и год
    if (digits.length > 4) {
        formatted += '.';
        formatted += year;
    }

    input.value = formatted;

    // Если календарь открыт – обновляем выделение
    const calendar = document.getElementById('custom-calendar');
    if (calendar && calendar.style.display === 'block') {
        updateCalendarHighlight(input, calendar);
    }

    // Если введён полный формат (8 цифр => DD.MM.YYYY), автоматически строим календарь
    if (digits.length === 8) {
        generateLifeCalendar();
    }
}

function updateCalendarDates(calendar, year, month) {
    const datesContainer = calendar.querySelector('.calendar-dates');
    datesContainer.innerHTML = '';
    const firstDay = new Date(year, month, 1);
    const startingDay = firstDay.getDay(); // 0–6, где 0 = воскресенье
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Добавляем пустые ячейки до первого дня месяца
    for (let i = 0; i < startingDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-date empty';
        datesContainer.appendChild(emptyCell);
    }
    
    // Добавляем ячейки с числами месяца
    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-date';
        cell.dataset.day = d;
        cell.textContent = d;
        cell.addEventListener('click', function(e) {
            e.stopPropagation();
            const monthSelect = calendar.querySelector('#calendar-month-select');
            const yearSelect = calendar.querySelector('#calendar-year-select');
            const newDate = new Date(parseInt(yearSelect.value, 10), parseInt(monthSelect.value, 10), d);
            document.getElementById('birthdate-input').value = formatCustomDate(newDate);
            hideCustomCalendar();
            generateLifeCalendar();
        });
        datesContainer.appendChild(cell);
    }
}