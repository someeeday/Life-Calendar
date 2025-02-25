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
    }

    init() {
        this.applyStoredSettings();
        this.setupEventListeners();
        this.updateAllTranslations();
        this.syncSelectsWithSettings();
        this.setupLanguageAndThemeHandlers();
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
            this.showError(translations[this.language].invalidDate);
            return;
        }

        try {
            // Сначала обновляем календарь
            const livedWeeks = this.calculateLivedWeeks(birthdate);
            window.app.components.calendar.draw(livedWeeks);
            
            // Сохраняем дату в любом случае
            this.storage.setSetting('birthdate', birthdate);

            // Пытаемся отправить данные в Telegram только если это WebApp
            const result = await window.app.telegram.sendUserData(birthdate);
            
            if (!result.browserMode) {
                // Показываем результат только для Telegram WebApp
                if (result.success) {
                    this.hideError();
                    this.emit('dateUpdated', birthdate);
                } else {
                    this.showError(result.error || translations[this.language].errorCreating);
                }
            }
        } catch (error) {
            console.error('Ошибка:', error);
            // Показываем ошибку только в WebApp режиме
            if (window.app.telegram.isTelegramWebApp()) {
                this.showError(translations[this.language].errorCreating);
            }
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
        // Обновляем календарь с текущим языком
        const birthdate = document.getElementById('birthdate-input')?.value;
        if (birthdate) {
            const livedWeeks = this.calculateLivedWeeks(birthdate);
            window.app.components.calendar.setLanguage(lang);
            window.app.components.calendar.draw(livedWeeks);
        }
    }

    handleThemeChange(theme) {
        this.updateTheme(theme);
        this.storage.setSetting('theme', theme);
        this.emit('themeChanged', theme);
        // Обновляем календарь с текущей темой
        const birthdate = document.getElementById('birthdate-input')?.value;
        if (birthdate) {
            const livedWeeks = this.calculateLivedWeeks(birthdate);
            window.app.components.calendar.updateTheme(theme);
            window.app.components.calendar.draw(livedWeeks);
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
        const settings = this.storage.loadSettings();
        const notice = document.createElement('div');
        notice.className = 'browser-notice';
        notice.style.cssText = `
            background: #fff3cd;
            color: #856404;
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
            text-align: center;
            animation: fadeIn 0.3s ease;
        `;
        notice.textContent = translations[settings.language].openBot;
        this.form.appendChild(notice);
    }

    showError(message) {
        if (this.errorElement) {
            this.errorElement.textContent = message;
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
}
