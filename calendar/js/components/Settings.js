import { translations } from '../config/translations.js';
import { themes } from '../config/themes.js';
import { StorageService } from '../services/StorageService.js';
import { TelegramService } from '../services/TelegramService.js';

export class Settings {
    constructor(selector) {
        this.form = document.querySelector(selector);
        this.langSelect = document.querySelector('#lang-select');
        this.themeSelect = document.querySelector('#theme-select');
        this.storage = new StorageService();
        this.telegram = new TelegramService();
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

        // Показываем модальное окно только в браузере, а не в WebApp
        if (!window.Telegram?.WebApp?.initDataUnsafe?.user) {
            setTimeout(() => {
                this.showTelegramModal();
            }, 1500);
        }
    }

    applyStoredSettings() {
        const settings = this.storage.getAllSettings();
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
            return;
        }
        
        this.isSubmitting = true;
        this.showLoading(true);
        
        try {
            const livedWeeks = this.calculateLivedWeeks(birthdate);
            window.app.components.calendar.draw(livedWeeks);
            
            this.storage.setSetting('birthdate', birthdate);
            
            const isApiHealthy = await this.telegram.checkApiHealth();
            
            if (isApiHealthy && this.telegram.isTelegramWebApp() && this.telegram.userId && !this.telegram.userId.startsWith('web_')) {
                try {
                    await this.telegram.sendBirthdateToApi(birthdate);
                    console.log('Birthdate sent to API successfully');
                } catch (apiError) {
                    console.warn('Failed to send birthdate to API:', apiError);
                }
            }
            
            this.hideError();
        } catch (error) {
            console.error('Ошибка:', error);
            this.showError(translations[document.documentElement.lang].errorCreating);
        } finally {
            this.isSubmitting = false;
            this.showLoading(false);
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
        
        const event = new CustomEvent('languageChanged', { 
            detail: lang,
            bubbles: true 
        });
        document.dispatchEvent(event);
        
        if (typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('languageChanged', { 
                detail: lang 
            }));
        }
        
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

        if (window.app?.components?.footer && !window.app.components.footer.isHidden) {
            window.app.components.footer.updateContent(lang);
        }
    }

    handleThemeChange(theme) {
        this.updateTheme(theme);
        this.storage.setSetting('theme', theme);
        this.emit('themeChanged', theme);
        
        if (window.app?.components?.calendar) {
            window.app.components.calendar.updateTheme(theme);
            
            const birthdate = document.getElementById('birthdate-input')?.value;
            if (birthdate) {
                const livedWeeks = this.calculateLivedWeeks(birthdate);
                window.app.components.calendar.draw(livedWeeks);
            } else {
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
        document.querySelectorAll('[data-text-ru], [data-text-en]').forEach(el => {
            const text = el.getAttribute(`data-text-${lang}`);
            if (text) {
                if (el.tagName === 'BUTTON') {
                    el.textContent = text;
                } else {
                    el.textContent = text;
                }
            }
        });

        document.querySelectorAll('[data-placeholder-ru], [data-placeholder-en]').forEach(el => {
            const placeholder = el.getAttribute(`data-placeholder-${lang}`);
            if (placeholder) el.placeholder = placeholder;
        });
    }

    syncSelectsWithSettings() {
        const settings = this.storage.getAllSettings();
        if (this.langSelect) this.langSelect.value = settings.language;
        if (this.themeSelect) this.themeSelect.value = settings.theme;
    }

    showBrowserNotice() {
        const wasNoticeClosed = this.storage.getSetting('noticeClosed') === 'true';
        
        if (wasNoticeClosed || window.app.telegram) {
            return;
        }

        const settings = this.storage.getAllSettings();
        const notice = document.createElement('div');
        notice.className = 'browser-notice';
        
        const closeButton = document.createElement('span');
        closeButton.innerHTML = '&times;';
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
        messageContainer.style.marginRight = '20px';

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

        this.storage.setSetting('noticeClosed', 'false');
    }

    showError(message) {
        if (this.errorElement) {
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

    #validateSettings(settings) {
        const validThemes = ['light', 'dark', 'auto'];
        const validLanguages = ['ru', 'en'];
        
        return {
            theme: validThemes.includes(settings.theme) ? settings.theme : 'light',
            language: validLanguages.includes(settings.language) ? settings.language : 'ru'
        };
    }

    restoreCalendarState() {
        const settings = this.storage.getAllSettings();
        
        if (window.app?.components?.calendar) {
            window.app.components.calendar.setLanguage(settings.language);
            window.app.components.calendar.updateTheme(settings.theme);
        }

        const birthdate = settings.birthdate;
        if (birthdate && this.validateDate(birthdate)) {
            const birthdateInput = document.getElementById('birthdate-input');
            if (birthdateInput) {
                birthdateInput.value = birthdate;
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

    showLoading(isLoading) {
        const button = document.getElementById('create-calendar-btn');
        if (!button) return;
        
        button.disabled = isLoading;
    }

    showTelegramModal() {
        const postponedUntil = parseInt(this.storage.getSetting('postponedUntil') || '0', 10);
        const now = Date.now();
        
        if (postponedUntil && now < postponedUntil) {
            return;
        }

        try {
            const modal = document.createElement('div');
            modal.className = 'telegram-modal';
            modal.style.position = 'fixed';
            modal.style.zIndex = '9999';
            
            const notice = document.createElement('div');
            notice.className = 'telegram-notice';
            
            const header = document.createElement('div');
            header.className = 'telegram-notice-header';
            
            const icon = document.createElement('div');
            icon.className = 'telegram-icon';
            
            const title = document.createElement('div');
            title.className = 'telegram-notice-title';
            title.textContent = 'Telegram';
            
            const closeBtn = document.createElement('button');
            closeBtn.className = 'close-button';
            closeBtn.innerHTML = '&times;';
            closeBtn.style.cursor = 'pointer';
            closeBtn.addEventListener('click', () => {
                this.closeModal(modal);
            });
            
            header.appendChild(icon);
            header.appendChild(title);
            header.appendChild(closeBtn);
            
            const content = document.createElement('div');
            content.className = 'telegram-notice-content';
            
            const message = document.createElement('p');
            const lang = document.documentElement.lang || 'ru';
            message.textContent = translations[lang].openBot.replace('@LifeCalendarRobot', '').trim();
            
            const actions = document.createElement('div');
            actions.className = 'telegram-notice-actions';
            actions.style.display = 'flex';
            actions.style.justifyContent = 'space-between';
            
            const closeButton = document.createElement('button');
            closeButton.className = 'button-secondary';
            closeButton.textContent = lang === 'ru' ? 'Закрыть' : 'Close';
            closeButton.style.cursor = 'pointer';
            closeButton.style.flex = '1';
            closeButton.style.marginRight = '10px';
            closeButton.addEventListener('click', () => {
                const postponeTime = Date.now() + (24 * 60 * 60 * 1000);
                this.storage.setSetting('postponedUntil', postponeTime.toString());
                this.closeModal(modal);
            });
            
            const openBotBtn = document.createElement('a');
            openBotBtn.href = 'https://t.me/LifeCalendarRobot';
            openBotBtn.target = '_blank';
            openBotBtn.className = 'button-primary';
            openBotBtn.textContent = '@LifeCalendarRobot';
            openBotBtn.style.textDecoration = 'none';
            openBotBtn.style.cursor = 'pointer';
            openBotBtn.style.flex = '1';
            
            actions.appendChild(closeButton);
            actions.appendChild(openBotBtn);
            
            content.appendChild(message);
            content.appendChild(actions);
            
            notice.appendChild(header);
            notice.appendChild(content);
            modal.appendChild(notice);
            
            if (document.body) {
                document.body.appendChild(modal);
                
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeModal(modal);
                    }
                });
                
                setTimeout(() => {
                    modal.classList.add('active');
                }, 10);
            }

            this.on('languageChanged', (lang) => {
                message.textContent = translations[lang].openBot.replace('@LifeCalendarRobot', '').trim();
                closeButton.textContent = lang === 'ru' ? 'Закрыть' : 'Close';
            });
        } catch (error) {
            /* обрабатываем ошибки тихо */
        }
    }
    
    closeModal(modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}
