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
    }

    init() {
        this.applyStoredSettings();
        this.setupEventListeners();
        this.updateAllTranslations();
        this.syncSelectsWithSettings();
        this.setupLanguageAndThemeHandlers();
        
        // Восстанавливаем календарь при загрузке
        this.restoreCalendarState();
    }

    applyStoredSettings() {
        const settings = this.storage.loadSettings();
        this.updateLanguage(settings.language);
        this.updateTheme(settings.theme);
    }

    setupEventListeners() {
        this.langSelect?.addEventListener('change', (e) => this.handleLanguageChange(e.target.value));
        this.themeSelect?.addEventListener('change', (e) => this.handleThemeChange(e.target.value));
        
        // Обработчик для формы
        this.form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        // Слушаем системные изменения темы
        window.matchMedia('(prefers-color-scheme: dark)').addListener((e) => {
            this.handleSystemThemeChange(e.matches ? 'dark' : 'light');
        });
    }

    setupLanguageAndThemeHandlers() {
        // Обработчики для селектов языка и темы
        const langSelect = document.getElementById('lang-select');
        const themeSelect = document.getElementById('theme-select');

        langSelect?.addEventListener('change', (e) => {
            this.handleLanguageChange(e.target.value);
        });

        themeSelect?.addEventListener('change', (e) => {
            this.handleThemeChange(e.target.value);
        });
    }

    async handleFormSubmit() {
        const birthdate = document.getElementById('birthdate-input')?.value;
        
        if (!birthdate) {
            this.showError(translations[document.documentElement.lang].invalidDate);
            return;
        }
        
        if (this.isSubmitting) {
            console.log("Запрос уже выполняется...");
            return;
        }
        
        this.isSubmitting = true;
        
        try {
            // Показываем индикатор загрузки
            this.showLoading(true);
            
            // Обновляем календарь
            const livedWeeks = this.calculateLivedWeeks(birthdate);
            window.app.components.calendar.draw(livedWeeks);
            
            // Сохраняем дату локально
            this.storage.setSetting('birthdate', birthdate);
            this.hideError();

            // Отправляем данные на сервер
            const result = await window.app.telegram.sendUserData(birthdate);
            
            if (!result.success && !result.browserMode) {
                // Показываем ошибку с ID пользователя для диагностики
                let errorMsg = translations[document.documentElement.lang].errorCreating;
                if (result.userId) {
                    errorMsg += ` (ID: ${result.userId})`;
                }
                this.showError(errorMsg);
            }
        } catch (error) {
            console.error('Ошибка:', error);
            // Получаем ID для диагностики
            const userId = window.app.telegram.tg?.initDataUnsafe?.user?.id || 'unknown';
            this.showError(`${translations[document.documentElement.lang].errorCreating} (ID: ${userId})`);
        } finally {
            this.showLoading(false);
            this.isSubmitting = false;
        }
    }

    calculateLivedWeeks(birthdate) {
        const parts = birthdate.split('.');
        const birthDate = new Date(parts[2], parts[1] - 1, parts[0]);
        const currentDate = new Date();
        return Math.floor((currentDate - birthDate) / (1000 * 60 * 60 * 24 * 7));
    }

    handleLanguageChange(lang) {
        this.updateLanguage(lang);
        this.storage.setSetting('language', lang);
        this.emit('languageChanged', lang);
        
        // Обновляем календарь и футер
        if (window.app?.components?.calendar) {
            window.app.components.calendar.setLanguage(lang);
            const birthdate = document.getElementById('birthdate-input')?.value;
            if (birthdate) {
                const livedWeeks = this.calculateLivedWeeks(birthdate);
                window.app.components.calendar.draw(livedWeeks);
            } else {
                window.app.components.calendar.draw();
            }
        }

        // Обновляем футер если он отображается
        if (window.app?.components?.footer && !window.app.components.footer.isHidden) {
            window.app.components.footer.updateContent(lang);
        }
    }

    handleThemeChange(theme) {
        this.updateTheme(theme);
        this.storage.setSetting('theme', theme);
        this.emit('themeChanged', theme);
        
        // Обновляем календарь вне зависимости от наличия даты
        if (window.app?.components?.calendar) {
            window.app.components.calendar.updateTheme(theme);
            
            // Если есть дата, обновляем с прожитыми неделями
            const birthdate = document.getElementById('birthdate-input')?.value;
            if (birthdate) {
                const livedWeeks = this.calculateLivedWeeks(birthdate);
                window.app.components.calendar.draw(livedWeeks);
            } else {
                // Если даты нет, просто перерисовываем пустой календарь
                window.app.components.calendar.draw();
            }
        }
    }

    handleSystemThemeChange(theme) {
        if (this.storage.getSetting('theme') === 'auto') {
            this.updateTheme(theme);
        }
    }

    updateLanguage(lang) {
        document.documentElement.lang = lang;
        this.updateAllTranslations();
        this.langSelect.value = lang;
    }

    updateTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const colors = themes[theme];
        Object.entries(colors).forEach(([key, value]) => {
            document.documentElement.style.setProperty(`--${key}-color`, value);
        });
        this.themeSelect.value = theme;
    }

    updateAllTranslations() {
        const lang = document.documentElement.lang;
        // Обновляем все элементы с атрибутами перевода
        document.querySelectorAll('[data-text-ru], [data-text-en]').forEach(el => {
            const text = el.getAttribute(`data-text-${lang}`);
            if (text) {
                // Для кнопок и других элементов
                if (el.tagName === 'BUTTON') {
                    el.textContent = text;
                } else {
                    el.textContent = text;
                }
            }
        });

        // Обновляем плейсхолдеры
        document.querySelectorAll('[data-placeholder-ru], [data-placeholder-en]').forEach(el => {
            const placeholder = el.getAttribute(`data-placeholder-${lang}`);
            if (placeholder) el.placeholder = placeholder;
        });
    }

    syncSelectsWithSettings() {
        const settings = this.storage.loadSettings();
        if (this.langSelect) this.langSelect.value = settings.language;
        if (this.themeSelect) this.themeSelect.value = settings.theme;
    }

    showBrowserNotice() {
        // Проверяем, было ли уже закрыто уведомление
        const wasNoticeClosed = this.storage.getSetting('noticeClosed') === 'true';
        
        if (wasNoticeClosed) {
            return;
        }

        const settings = this.storage.loadSettings();
        const notice = document.createElement('div');
        notice.className = 'browser-notice';
        
        const closeButton = document.createElement('span');
        closeButton.innerHTML = '&times;'; // × символ
        closeButton.className = 'close-button';
        closeButton.style.cssText = `
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            cursor: pointer;
            font-size: 20px;
            color: #856404;
        `;
        
        // При закрытии сохраняем состояние
        closeButton.addEventListener('click', () => {
            this.storage.setSetting('noticeClosed', 'true');
            notice.remove();
        });

        const link = document.createElement('a');
        link.href = 'https://t.me/LifeCalendarRobot';
        link.target = '_blank';
        link.textContent = '@LifeCalendarRobot';
        link.style.color = '#856404';
        link.style.textDecoration = 'underline';

        const messageContainer = document.createElement('div');
        messageContainer.style.marginRight = '20px'; // Место для крестика

        // Разбиваем текст на части до и после @LifeCalendarRobot
        const message = translations[settings.language].openBot;
        const [before, after] = message.split('@LifeCalendarRobot');
        
        messageContainer.appendChild(document.createTextNode(before));
        messageContainer.appendChild(link);
        if (after) {
            messageContainer.appendChild(document.createTextNode(after));
        }

        notice.style.cssText = `
            background: #fff3cd;
            color: #856404;
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
            text-align: center;
            animation: fadeIn 0.3s ease;
            position: relative;
        `;

        notice.appendChild(messageContainer);
        notice.appendChild(closeButton);
        this.form.appendChild(notice);

        // Обновляем уведомление при смене языка
        this.on('languageChanged', (lang) => {
            const newMessage = translations[lang].openBot;
            const [newBefore, newAfter] = newMessage.split('@LifeCalendarRobot');
            messageContainer.innerHTML = '';
            messageContainer.appendChild(document.createTextNode(newBefore));
            messageContainer.appendChild(link.cloneNode(true));
            if (newAfter) {
                messageContainer.appendChild(document.createTextNode(newAfter));
            }
        });

        // Сохраняем состояние уведомления
        this.storage.setSetting('noticeClosed', 'false');
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
        const settings = this.storage.loadSettings();
        
        // Сначала применяем тему и язык
        if (window.app?.components?.calendar) {
            window.app.components.calendar.setLanguage(settings.language);
            window.app.components.calendar.updateTheme(settings.theme);
        }

        // Затем восстанавливаем дату и отрисовываем календарь
        const birthdate = settings.birthdate;
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
        
        if (isLoading) {
            // Сохраняем оригинальный текст кнопки
            button.dataset.originalText = button.textContent;
            // Добавляем индикатор загрузки
            button.textContent = '⏳ ' + translations[document.documentElement.lang].loading;
            button.disabled = true;
        } else {
            // Восстанавливаем оригинальный текст
            button.textContent = button.dataset.originalText || translations[document.documentElement.lang].createCalendar;
            button.disabled = false;
        }
    }
}
