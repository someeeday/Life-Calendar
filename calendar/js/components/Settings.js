import { StorageService } from '../services/StorageService.js';
import { TelegramService } from '../services/TelegramService.js';

export class Settings {
    constructor(selector) {
        this.form = document.querySelector(selector);
        this.storage = new StorageService();
        this.telegram = new TelegramService();
        this.eventListeners = {};
        this.errorElement = document.getElementById('birthdate-error');
        this.isSubmitting = false; // Флаг для предотвращения множественных запросов
        this.translations = {
            invalidDate: 'Please enter your birth date',
            errorCreating: 'Error creating calendar',
            createCalendar: 'Create Calendar',
            confirmOldAge: 'Age exceeds 90 years. Show fully filled calendar?',
            errorFetch: 'Failed to connect to the server',
            retryConnection: 'Retry',
            connectionError: 'Problem connecting to the server. Please check your internet connection.',
            serverError: 'Server error. Please try again later.',
            usingDefaults: 'Using backup connection...',
            corsError: 'Cross-origin request issues, using local mode.',
            debugInfo: 'Debug information',
            contactText: 'If you have any questions or suggestions, message me:'
        };
    }

    init() {
        this.applyStoredSettings();
        this.setupEventListeners();
        
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
    }

    setupEventListeners() {
        // Обработчик для формы
        this.form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });
    }

    async handleFormSubmit() {
        const birthdate = document.getElementById('birthdate-input')?.value;
        
        if (!birthdate) {
            this.showError('invalidDate');
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
            console.error('Error:', error);
            this.showError('errorCreating');
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

    showError(message) {
        const errorMessage = this.translations[message] || message;
        if (this.errorElement) {
            this.errorElement.textContent = errorMessage;
            this.errorElement.style.display = 'block';
        } else {
            console.error('Error:', errorMessage);
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

    restoreCalendarState() {
        const settings = this.storage.getAllSettings();
        
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
            message.textContent = 'Open @LifeCalendarRobot on Telegram to get started.';
            
            const actions = document.createElement('div');
            actions.className = 'telegram-notice-actions';
            actions.style.display = 'flex';
            actions.style.justifyContent = 'space-between';
            
            const closeButton = document.createElement('button');
            closeButton.className = 'button-secondary';
            closeButton.textContent = 'Close';
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
