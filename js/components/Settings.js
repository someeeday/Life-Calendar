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
    }

    init() {
        this.applyStoredSettings();
        this.setupEventListeners();
        this.updateAllTranslations();
        this.syncSelectsWithSettings();
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

    async handleFormSubmit() {
        const birthdate = document.getElementById('birthdate-input')?.value;
        
        if (!birthdate) {
            this.showError('Введите дату рождения');
            return;
        }

        try {
            const result = await window.app.telegram.sendUserData(birthdate);
            
            if (result.success) {
                // Сохраняем дату в локальное хранилище
                this.storage.setSetting('birthdate', birthdate);
                
                // Обновляем календарь
                this.emit('dateUpdated', birthdate);
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            console.error('Ошибка отправки данных:', error);
            this.showError('Произошла ошибка при отправке данных');
        }
    }

    handleLanguageChange(lang) {
        this.updateLanguage(lang);
        this.storage.setSetting('language', lang);
        this.emit('languageChanged', lang);
    }

    handleThemeChange(theme) {
        this.updateTheme(theme);
        this.storage.setSetting('theme', theme);
        this.emit('themeChanged', theme);
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
        document.querySelectorAll('[data-text-ru], [data-text-en]').forEach(el => {
            const text = el.getAttribute(`data-text-${lang}`);
            if (text) el.textContent = text;
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
