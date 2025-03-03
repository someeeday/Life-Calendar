import { translations } from '../config/translations.js';
import { themes } from '../config/themes.js';
import { StorageService } from '../services/StorageService.js';

export class Settings {
    constructor(selector) {
        this.form = document.querySelector(selector);
        this.langSelect = document.querySelector('#lang-select');
        this.themeSelect = document.querySelector('#theme-select');
        this.storage = new StorageService();
        this.eventListeners = {};
        this.errorElement = document.getElementById('birthdate-error');
        this.isSubmitting = false; // Флаг для предотвращения множественных запросов
        this.activeNotice = null; // Добавляем ссылку на активное уведомление
    }

    init() {
        // Получаем сохраненные настройки
        const settings = {
            theme: this.storage.getSetting('theme'),
            language: this.storage.getSetting('language')
        };
        
        // Применяем настройки до остальной инициализации
        document.documentElement.setAttribute('data-theme', settings.theme);
        document.documentElement.lang = settings.language;
        
        // Настраиваем интерфейс - важно установить значения до добавления обработчиков
        if (this.langSelect) this.langSelect.value = settings.language;
        if (this.themeSelect) this.themeSelect.value = settings.theme;
        
        // Обновляем переводы UI
        this.updateAllTranslations();
        
        // Устанавливаем обработчики событий
        this.setupEventListeners();
        
        // Восстанавливаем календарь
        setTimeout(() => this.restoreCalendarState(), 0);

        // Добавляем показ уведомления после инициализации
        setTimeout(() => this.showBrowserNotice(), 500);
    }

    setupEventListeners() {
        // Удаляем старые обработчики если есть
        this.langSelect?.removeEventListener('change', this._handleLangChange);
        this.themeSelect?.removeEventListener('change', this._handleThemeChange);
        
        // Сохраняем функции-обработчики для возможности их удаления
        this._handleLangChange = (e) => {
            const lang = e.target.value;
            this.storage.setSetting('language', lang);
            this.handleLanguageChange(lang);
        };
        
        this._handleThemeChange = (e) => {
            const theme = e.target.value;
            this.storage.setSetting('theme', theme);
            this.updateTheme(theme);
        };
        
        // Добавляем новые обработчики
        this.langSelect?.addEventListener('change', this._handleLangChange);
        this.themeSelect?.addEventListener('change', this._handleThemeChange);
        
        // Обработчик формы
        this.form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });
        
        // Кнопка создания календаря
        const createButton = document.getElementById('create-calendar-btn');
        if (createButton) {
            createButton.addEventListener('click', () => this.handleFormSubmit());
        }

        // Слушаем системные изменения темы
        window.matchMedia('(prefers-color-scheme: dark)').addListener((e) => {
            this.handleSystemThemeChange(e.matches ? 'dark' : 'light');
        });
    }

    async handleFormSubmit() {
        const birthdate = document.getElementById('birthdate-input')?.value;
        
        if (!birthdate) {
            this.showError(translations[document.documentElement.lang].invalidDate);
            return;
        }
        
        if (this.isSubmitting) {
            return;
        }
        
        this.isSubmitting = true;
        
        try {
            // Обновляем только календарь
            const livedWeeks = this.calculateLivedWeeks(birthdate);
            window.app.components.calendar.draw(livedWeeks);
            
            // Сохраняем дату локально
            this.storage.setSetting('birthdate', birthdate);
            this.hideError();
        } catch (error) {
            console.error('Ошибка:', error);
            this.showError(translations[document.documentElement.lang].errorCreating);
        } finally {
            this.isSubmitting = false;
        }
    }

    calculateLivedWeeks(birthdate) {
        const parts = birthdate.split('.');
        const birthDate = new Date(parts[2], parts[1] - 1, parts[0]);
        const currentDate = new Date();
        return Math.floor((currentDate - birthDate) / (1000 * 60 * 60 * 24 * 7));
    }

    handleLanguageChange(lang, save = true) {
        // Сначала обновляем UI
        this.updateLanguage(lang);

        if (save) {
            // Затем сохраняем
            this.storage.setSetting('language', lang);
        }
        
        // Генерируем событие для других компонентов
        this.emit('languageChanged', lang);
        
        // Обновляем календарь если есть
        if (window.app?.components?.calendar) {
            window.app.components.calendar.setLanguage(lang);
            
            // Перерисовываем календарь с датой
            const birthdate = document.getElementById('birthdate-input')?.value;
            if (birthdate && this.validateDate(birthdate)) {
                const livedWeeks = this.calculateLivedWeeks(birthdate);
                window.app.components.calendar.draw(livedWeeks);
            } else {
                window.app.components.calendar.draw();
            }
        }
    }

    handleThemeChange(theme) {
        // Сначала сохраняем
        this.storage.setSetting('theme', theme);

        // Затем обновляем UI
        this.updateTheme(theme);
        
        // И обновляем календарь если он есть
        if (window.app?.components?.calendar) {
            window.app.components.calendar.updateTheme(theme);
        }
    }

    // Убираем реакцию на системную тему
    handleSystemThemeChange(theme) {
        // Ничего не делаем, всегда используем выбранную тему
    }

    updateLanguage(lang) {
        if (!lang) return;
        
        // Устанавливаем язык документа
        document.documentElement.lang = lang;
        
        // Синхронизируем селект с текущим значением
        if (this.langSelect && this.langSelect.value !== lang) {
            this.langSelect.value = lang;
        }
        
        // Обновляем все тексты
        this.updateAllTranslations();
    }

    updateTheme(theme, save = true) {
        // Обновление DOM
        document.documentElement.setAttribute('data-theme', theme);
        
        // Обновление стилей через CSS-переменные
        const colors = themes[theme];
        Object.entries(colors).forEach(([key, value]) => {
            document.documentElement.style.setProperty(`--${key}-color`, value);
        });
        
        // Обновление календаря
        if (window.app?.components?.calendar) {
            window.app.components.calendar.updateTheme(theme);
        }

        if (save) {
            this.storage.setSetting('theme', theme);
        }
    }

    updateAllTranslations() {
        const lang = document.documentElement.lang || 'ru';
        
        // Обновляем все элементы с атрибутами перевода
        document.querySelectorAll('[data-text-ru], [data-text-en]').forEach(el => {
            const text = el.getAttribute(`data-text-${lang}`);
            if (text) {
                el.textContent = text;
            }
        });

        // Обновляем плейсхолдеры
        document.querySelectorAll('[data-placeholder-ru], [data-placeholder-en]').forEach(el => {
            const placeholder = el.getAttribute(`data-placeholder-${lang}`);
            if (placeholder) el.placeholder = placeholder;
        });
    }

    syncSelectsWithSettings() {
        // Получаем настройки через getSetting
        if (this.langSelect) this.langSelect.value = this.storage.getSetting('language');
        if (this.themeSelect) this.themeSelect.value = this.storage.getSetting('theme');
    }

    showBrowserNotice() {
        // Получаем время последнего показа
        const lastShown = parseInt(this.storage.getSetting('botLastShown') || '0', 10);
        const currentTime = Date.now();
        
        // Интервал показа: 3 дня (в миллисекундах)
        const showInterval = 3 * 24 * 60 * 60 * 1000;
        
        // Показываем уведомление, если прошло достаточно времени
        const shouldShow = currentTime - lastShown > showInterval;
        
        if (!shouldShow) {
            return; // Если недавно показывали, пропускаем
        }

        // Сохраняем текущее время как время последнего показа
        this.storage.setSetting('botLastShown', currentTime.toString());
        
        // Создаем и показываем уведомление
        this.createBotNotice();
        
        // Добавляем обработчик изменения языка для обновления уведомления
        this.on('languageChanged', (lang) => {
            // Если уведомление активно, обновляем его текст
            if (this.activeNotice) {
                this.updateNoticeText(lang);
            }
        });
    }
    
    createBotNotice() {
        const lang = document.documentElement.lang || 'ru';
        const message = translations[lang].openBot;
        
        // Создаём контейнер для уведомления
        const notice = document.createElement('div');
        notice.className = 'bot-notice';
        notice.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            max-width: 320px;
            background: white;
            color: #333;
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            animation: slideIn 0.3s forwards;
            border-left: 4px solid var(--color-primary);
        `;
        
        // Сохраняем ссылку на активное уведомление
        this.activeNotice = notice;

        // Добавляем стили для анимации
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        // Создаём кнопку закрытия
        const closeButton = document.createElement('span');
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            font-size: 20px;
            cursor: pointer;
            color: #999;
            transition: color 0.2s;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        closeButton.onmouseover = () => closeButton.style.color = 'var(--color-primary)';
        closeButton.onmouseout = () => closeButton.style.color = '#999';
        
        // Создаем контент уведомления
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'notice-content';
        contentWrapper.style.cssText = `
            display: flex;
            align-items: flex-start;
        `;
        
        // Иконка Telegram
        const icon = document.createElement('div');
        icon.style.cssText = `
            width: 40px;
            height: 40px;
            background: var(--color-primary);
            border-radius: 50%;
            margin-right: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        `;
        
        // Бумажный самолётик (иконка Telegram)
        icon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.665 3.717L2.93496 10.554C1.72496 11.04 1.73196 11.715 2.71296 12.016L7.26496 13.436L17.797 6.791C18.295 6.488 18.75 6.651 18.376 6.983L9.84296 14.684H9.84096L9.84296 14.685L9.52896 19.377C9.98896 19.377 10.192 19.166 10.45 18.917L12.661 16.767L17.26 20.164C18.108 20.631 18.717 20.391 18.928 19.379L21.947 5.151C22.256 3.912 21.474 3.351 20.665 3.717Z" fill="white"/>
        </svg>`;
        
        contentWrapper.appendChild(icon);
        
        // Текстовое содержимое
        const textContent = document.createElement('div');
        textContent.className = 'notice-text';
        textContent.style.cssText = `flex: 1;`;
        
        // Добавляем заголовок
        const title = document.createElement('div');
        title.textContent = 'Telegram Bot';
        title.style.cssText = `
            font-weight: 500;
            margin-bottom: 5px;
        `;
        textContent.appendChild(title);
        
        // Добавляем текстовое содержимое (будет обновляться)
        this.updateNoticeText(lang, textContent);
        
        contentWrapper.appendChild(textContent);
        
        // Собираем уведомление
        notice.appendChild(closeButton);
        notice.appendChild(contentWrapper);
        document.body.appendChild(notice);
        
        // Обработчик закрытия
        const closeNotice = () => {
            notice.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => {
                notice.remove();
                style.remove();
                this.activeNotice = null; // Очищаем ссылку
            }, 300);
        };
        
        closeButton.addEventListener('click', closeNotice);
        
        // Автоматическое закрытие через 15 секунд
        setTimeout(closeNotice, 15000);
    }
    
    // Новый метод для обновления текста уведомления при смене языка
    updateNoticeText(lang, textElement = null) {
        const message = translations[lang]?.openBot || '';
        if (!message) return;
        
        // Используем переданный элемент или находим в активном уведомлении
        const textContainer = textElement || this.activeNotice?.querySelector('.notice-text');
        if (!textContainer) return;
        
        // Очищаем текущее содержимое, оставляя только заголовок
        while (textContainer.childNodes.length > 1) {
            textContainer.removeChild(textContainer.lastChild);
        }
        
        // Разбиваем текст на части до и после @LifeCalendarRobot
        const [before, after] = message.split('@LifeCalendarRobot');
        
        // Добавляем текст
        textContainer.appendChild(document.createTextNode(before));
        
        const link = document.createElement('a');
        link.href = 'https://t.me/LifeCalendarRobot';
        link.target = '_blank';
        link.textContent = '@LifeCalendarRobot';
        link.style.cssText = `
            color: var(--color-primary);
            text-decoration: none;
            font-weight: 500;
        `;
        textContainer.appendChild(link);
        
        if (after) {
            textContainer.appendChild(document.createTextNode(after));
        }
    }

    showError(message) {
        if (this.errorElement) {
            // Если сообщение содержит ID, выделяем его жирным
            if (message.includes('ID:')) {
                const parts = message.split('(ID:');
                const baseMsg = parts[0].trim();
                const idPart = parts[1].replace(')', '').trim();
                
                this.errorElement.innerHTML = `${baseMsg} <br><small>(ID: <strong>${idPart}</strong>)</small>`;
            } else {
                this.errorElement.textContent = message;
            }
            
            this.errorElement.style.display = 'block';
        } else {
            console.error('Error:', message);
        }
    }

    hideError() {
        if (this.errorElement) {
            this.errorElement.style.display = 'none';
        }
    }

    // Система событий
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    off(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event]
                .filter(cb => cb !== callback);
        }
    }

    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => callback(data));
        }
    }

    // Утилиты
    #validateSettings(settings) {
        const validThemes = ['light', 'dark', 'auto'];
        const validLanguages = ['ru', 'en'];
        
        return {
            theme: validThemes.includes(settings.theme) ? settings.theme : 'light',
            language: validLanguages.includes(settings.language) ? settings.language : 'ru'
        };
    }

    // Новый метод для восстановления состояния календаря
    restoreCalendarState() {
        // Получаем настройки через getSetting
        const theme = this.storage.getSetting('theme');
        const language = this.storage.getSetting('language');
        const birthdate = this.storage.getSetting('birthdate');
        
        // Сначала применяем тему и язык
        if (window.app?.components?.calendar) {
            window.app.components.calendar.setLanguage(language);
            window.app.components.calendar.updateTheme(theme);
        }

        // Затем восстанавливаем дату и отрисовываем календарь
        if (birthdate && this.validateDate(birthdate)) {
            const birthdateInput = document.getElementById('birthdate-input');
            if (birthdateInput) {
                birthdateInput.value = birthdate;
                // Вычисляем прожитые недели и обновляем календарь
                const livedWeeks = this.calculateLivedWeeks(birthdate);
                window.app.components.calendar.draw(livedWeeks);
            }
        }
    }

    validateDate(dateString) {
        const parts = dateString.split('.');
        if (parts.length !== 3) return false;
        
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        
        if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
        if (month < 1 || month > 12) return false;
        if (year < 1900 || year > new Date().getFullYear()) return false;
        
        const daysInMonth = new Date(year, month, 0).getDate();
        return day > 0 && day <= daysInMonth;
    }

    // Добавим метод для отображения/скрытия индикатора загрузки
    showLoading(isLoading) {
        const button = document.getElementById('create-calendar-btn');
        if (!button) return;
        
        button.disabled = isLoading;
    }
}
