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
        this.eventListeners = {};
        this.errorElement = document.getElementById('birthdate-error');
        this.isSubmitting = false; // Флаг для предотвращения множественных запросов
        this.telegram = new TelegramService();
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
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
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
            return;
        }
        
        this.isSubmitting = true;
        this.showLoading(true);
        
        try {
            // Обновляем календарь
            const livedWeeks = this.calculateLivedWeeks(birthdate);
            window.app.components.calendar.draw(livedWeeks);
            
            // Сохраняем дату локально
            this.storage.setSetting('birthdate', birthdate);
            
            // Сначала проверяем доступность API
            const isApiHealthy = await this.telegram.checkApiHealth();
            
            // Отправляем дату рождения в API, если он доступен и Telegram WebApp доступен
            if (isApiHealthy && this.telegram.isTelegramWebApp() && this.telegram.userId && !this.telegram.userId.startsWith('web_')) {
                try {
                    await this.telegram.sendBirthdateToApi(birthdate);
                    console.log('Birthdate sent to API successfully');
                } catch (apiError) {
                    console.warn('Failed to send birthdate to API:', apiError);
                    // Не показываем ошибку пользователю, основная функция работает
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
        
        // Отправляем событие об изменении языка
        const event = new CustomEvent('languageChanged', { 
            detail: lang,
            bubbles: true 
        });
        document.dispatchEvent(event);
        
        // Дополнительно используем window для совместимости
        if (typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('languageChanged', { 
                detail: lang 
            }));
        }
        
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
        const settings = this.storage.getAllSettings();
        if (this.langSelect) this.langSelect.value = settings.language;
        if (this.themeSelect) this.themeSelect.value = settings.theme;
    }

    showTelegramModal() {
        // Проверяем, было ли отложено показ
        const postponedUntil = parseInt(this.storage.getSetting('postponedUntil') || '0', 10);
        const now = Date.now();
        
        // Не показываем, если время отложенного показа не пришло
        if (postponedUntil && now < postponedUntil) {
            return;
        }

        try {
            // Создаем модальное окно
            const modal = document.createElement('div');
            modal.className = 'telegram-modal';
            modal.style.position = 'fixed';
            modal.style.zIndex = '9999';
            
            const notice = document.createElement('div');
            notice.className = 'telegram-notice';
            
            // Создаем заголовок с иконкой
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
            
            // Создаем содержимое
            const content = document.createElement('div');
            content.className = 'telegram-notice-content';
            
            const message = document.createElement('p');
            const lang = document.documentElement.lang || 'ru';
            message.textContent = translations[lang].openBot.replace('@LifeCalendarRobot', '').trim();
            
            const actions = document.createElement('div');
            actions.className = 'telegram-notice-actions';
            actions.style.display = 'flex';
            actions.style.justifyContent = 'space-between';
            
            // Кнопка "Закрыть" (отложить на день)
            const closeButton = document.createElement('button');
            closeButton.className = 'button-secondary';
            closeButton.textContent = lang === 'ru' ? 'Закрыть' : 'Close';
            closeButton.style.cursor = 'pointer';
            closeButton.style.flex = '1';
            closeButton.style.marginRight = '10px';
            closeButton.addEventListener('click', () => {
                // Откладываем на 24 часа
                const postponeTime = Date.now() + (24 * 60 * 60 * 1000);
                this.storage.setSetting('postponedUntil', postponeTime.toString());
                this.closeModal(modal);
            });
            
            // Кнопка перехода к боту
            const openBotBtn = document.createElement('a');
            openBotBtn.href = 'https://t.me/LifeCalendarRobot';
            openBotBtn.target = '_blank';
            openBotBtn.className = 'button-primary';
            openBotBtn.textContent = '@LifeCalendarRobot';
            openBotBtn.style.textDecoration = 'none';
            openBotBtn.style.cursor = 'pointer';
            openBotBtn.style.flex = '1';
            
            // Добавляем кнопки
            actions.appendChild(closeButton);
            actions.appendChild(openBotBtn);
            
            content.appendChild(message);
            content.appendChild(actions);
            
            // Собираем все вместе
            notice.appendChild(header);
            notice.appendChild(content);
            modal.appendChild(notice);
            
            if (document.body) {
                document.body.appendChild(modal);
                
                // Клик по фону закрывает модальное окно
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeModal(modal);
                    }
                });
                
                // Делаем модальное окно видимым (для анимации)
                setTimeout(() => {
                    modal.classList.add('active');
                }, 10);
            }

            // Обновляем текст при смене языка
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
        const settings = this.storage.getAllSettings();
        
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
        
        button.disabled = isLoading;
    }
}
