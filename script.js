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
        
        // Обновляем flatpickr если он инициализирован
        if (birthdateInput._flatpickr) {
            birthdateInput._flatpickr.set('locale', {
                ...flatpickr.l10ns[lang === 'ru' ? 'ru' : 'en'],
                firstDayOfWeek: 1,
                formatDate: (date) => {
                    const d = date.getDate().toString().padStart(2, '0');
                    const m = (date.getMonth() + 1).toString().padStart(2, '0');
                    const y = date.getFullYear();
                    return `${d}.${m}.${y}`;
                }
            });
            
            // Принудительно обновляем отображение даты
            if (birthdateInput.value) {
                const currentDate = birthdateInput._flatpickr.selectedDates[0];
                if (currentDate) {
                    const d = currentDate.getDate().toString().padStart(2, '0');
                    const m = (currentDate.getMonth() + 1).toString().padStart(2, '0');
                    const y = currentDate.getFullYear();
                    birthdateInput.value = `${d}.${m}.${y}`;
                }
            }
        }
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
    if (currentBirthdate && document.querySelector('.calendar canvas').getContext('2d')) {
        createLifeGrid(calculateLivedWeeks());
    }
}

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

    // Инициализация выбора даты
    if (isMobile || isTelegram) {
        flatpickr("#birthdate", {
            dateFormat: "d.m.Y",
            maxDate: "today",
            locale: document.documentElement.lang === 'ru' ? 'ru' : 'en'
        });
    } else {
        const birthdateInput = document.getElementById('birthdate-input');
        birthdateInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 2) value = value.slice(0, 2) + '.' + value.slice(2);
            if (value.length > 5) value = value.slice(0, 5) + '.' + value.slice(5, 9);
            e.target.value = value;
        });
    }

    // Восстанавливаем настройки из всех источников с приоритетами
    const savedLang = getCookie('lang-select') || 
                     localStorage.getItem('lang-select') ||
                     (isTelegram ? tg.initDataUnsafe?.user?.language_code : null) ||
                     (navigator.language.startsWith('ru') ? 'ru' : 'en');
    
    const savedTheme = getCookie('theme-select') || 
                      localStorage.getItem('theme-select') ||
                      (isTelegram ? tg.colorScheme : null) ||
                      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    const savedBirthdate = getCookie('birthdate-input') || 
                          localStorage.getItem('birthdate-input');

    // Применяем сохраненные настройки
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
        createLifeGrid(); // Показываем пустой календарь по умолчанию
    }

    // Добавляем слушатели событий
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

    // Слушатель изменения размера окна
    window.addEventListener('resize', debounce(function() {
        if (document.getElementById('birthdate-input').value) {
            generateLifeCalendar();
        } else {
            createLifeGrid();
        }
    }, 250));
});

function createLifeGrid(livedWeeks = 0, totalYears = 91) {
    const weeksPerYear = 52;
    const canvas = document.getElementById('lifeCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Увеличенные размеры для лучшей читаемости
    const isMobile = document.body.classList.contains('is-mobile');
    const cellSize = isMobile ? 12 : 15;
    const padding = isMobile ? 60 : 80;
    const fontSize = isMobile ? 11 : 12;
    const cellGap = isMobile ? 1 : 2;
    
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
        setCookie('birthdate-input', birthdate, 365);
        saveSettings(
            document.getElementById('lang-select').value,
            document.getElementById('theme-select').value,
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
    try {
        setCookie('lang-select', lang, 365);
        setCookie('theme-select', theme, 365);
        if (birthdate) {
            setCookie('birthdate-input', birthdate, 365);
        }
        
        // Сохранение в localStorage как бэкап
        localStorage.setItem('lang-select', lang);
        localStorage.setItem('theme-select', theme);
        if (birthdate) {
            localStorage.setItem('birthdate-input', birthdate);
        }
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

function formatDate(dateString) {
    if (!dateString) return '';
    
    // Всегда ожидаем формат ДД.ММ.ГГГГ
    const parts = dateString.split('.');
    if (parts.length !== 3) return '';
    
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    
    // Преобразуем в формат YYYY-MM-DD
    return `${year}-${month}-${day}`;
}

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

function isValidDate(dateString) {
    if (!dateString) return false;
    
    const parts = dateString.split('.');
    if (parts.length !== 3) return false;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
    
    // Проверяем диапазоны
    if (year < 1900 || year > new Date().getFullYear()) return false;
    if (month < 1 || month > 12) return false;
    
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return false;
    
    const inputDate = new Date(year, month - 1, day);
    if (inputDate > new Date()) return false;
    
    return true;
}

function initializeDatePicker() {
    const birthdateInput = document.getElementById('birthdate-input');
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
        birthdateInput.readOnly = true;
        
        const fp = flatpickr(birthdateInput, {
            dateFormat: "d.m.Y",
            maxDate: "today",
            minDate: "1900-01-01",
            disableMobile: false,
            allowInput: false,
            locale: flatpickr.l10ns[document.documentElement.lang === 'ru' ? 'ru' : 'en'],
            onChange: function(selectedDates) {
                if (selectedDates[0]) {
                    const date = selectedDates[0];
                    const d = date.getDate().toString().padStart(2, '0');
                    const m = (date.getMonth() + 1).toString().padStart(2, '0');
                    const y = date.getFullYear();
                    birthdateInput.value = `${d}.${m}.${y}`;
                    generateLifeCalendar();
                }
            }
        });

        birthdateInput._flatpickr = fp;

        // Обновление локализации при смене языка
        document.addEventListener('languageChanged', function() {
            const lang = document.documentElement.lang;
            const isRu = lang === 'ru';
            
            birthdateInput.placeholder = isRu ? 'ДД.ММ.ГГГГ' : 'DD.MM.YYYY';
            
            if (birthdateInput._flatpickr) {
                birthdateInput._flatpickr.set('locale', flatpickr.l10ns[isRu ? 'ru' : 'en']);
            }
        });
    } else {
        // Десктопная версия с автоматическими точками
        birthdateInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            let formattedValue = '';
            
            if (value.length > 0) {
                formattedValue = value.slice(0, 2);
                if (value.length > 2) {
                    formattedValue += '.' + value.slice(2, 4);
                    if (value.length > 4) {
                        formattedValue += '.' + value.slice(4, 8);
                    }
                }
            }
            
            e.target.value = formattedValue;
            
            if (value.length === 8) {
                generateLifeCalendar();
            }
        });
    }
}

const style = document.createElement('style');
style.textContent = `
    .form-input.error {
        border-color: #ff4444;
        background-color: rgba(255, 68, 68, 0.1);
    }
`;
document.head.appendChild(style);

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