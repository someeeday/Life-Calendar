import { TelegramService } from './services/TelegramService.js';
import { Calendar } from './components/Calendar.js';
import { DatePicker } from './components/DatePicker.js';
import { Settings } from './components/Settings.js';
import { Footer } from './components/Footer.js';

class App {
    constructor() {
        this.telegram = new TelegramService();
        this.components = {
            calendar: new Calendar('#lifeCanvas'),
            datePicker: new DatePicker('#birthdate-input'),
            settings: new Settings('#settingsForm'),
            footer: new Footer('.footer')
        };
        
        this.init();
        this.setupEventListeners();
        this.debounceTimeout = null;
        this.isScrolling = false;
    }

    init() {
        // Сначала сохраняем ссылку на приложение глобально
        window.app = this;
        
        // Инициализируем базовые компоненты
        this.telegram.init();
        this.components.calendar.init();
        
        // Затем инициализируем настройки, которые восстановят состояние календаря
        this.components.settings.init();
        
        // Инициализируем оставшиеся компоненты
        this.components.datePicker.init();
        this.components.footer.init();
        
        if (!this.telegram.isTelegramWebApp()) {
            this.components.settings.showBrowserNotice();
            document.body.classList.add('browser-mode');
            console.log('🌐 Приложение открыто в браузере');
        } else {
            document.body.classList.add('webapp-mode');
            console.log('📱 Приложение открыто в Telegram WebApp');
        }
        this.optimizeScroll();
        this.deferNonCriticalOperations();
    }

    optimizeScroll() {
        // Оптимизация обработки скролла
        window.addEventListener('scroll', () => {
            if (this.debounceTimeout) clearTimeout(this.debounceTimeout);
            
            if (!this.isScrolling) {
                this.isScrolling = true;
                document.body.classList.add('is-scrolling');
            }

            this.debounceTimeout = setTimeout(() => {
                this.isScrolling = false;
                document.body.classList.remove('is-scrolling');
            }, 150);
        }, { passive: true });
    }

    deferNonCriticalOperations() {
        // Отложенная загрузка неважных операций
        requestIdleCallback(() => {
            this.components.footer.init();
            this.components.settings.showBrowserNotice();
        });
    }

    setupEventListeners() {
        // Обработчик изменения даты
        this.components.datePicker.input?.addEventListener('change', () => {
            const birthdate = this.components.datePicker.input.value;
            if (birthdate && this.components.datePicker.isValidDate(birthdate)) {
                const livedWeeks = this.components.settings.calculateLivedWeeks(birthdate);
                this.components.calendar.draw(livedWeeks);
            }
        });

        // Обработчик для кнопки создания календаря
        document.getElementById('create-calendar-btn')?.addEventListener('click', () => {
            this.components.settings.handleFormSubmit();
        });

        // Обработчик для ссылки автора - используем handleLinkClick вместо toggleHiddenContent
        document.getElementById('author-link')?.addEventListener('click', (e) => {
            this.components.footer.handleLinkClick(e);
        });
    }
}

// Сделаем экземпляр приложения глобально доступным
let app;

// Инициализация приложения после полной загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    // Создаем экземпляр приложения
    app = new App();
    
    // Эти функции теперь можно вызывать, т.к. window.app уже существует
    window.changeLanguage = (lang) => app.components.settings.handleLanguageChange(lang);
    window.changeTheme = (theme) => app.components.settings.handleThemeChange(theme);
});
