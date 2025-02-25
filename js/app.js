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
    }

    init() {
        this.telegram.init();
        Object.values(this.components).forEach(component => component.init());
        
        if (!this.telegram.isTelegramWebApp()) {
            this.components.settings.showBrowserNotice();
            // Добавляем класс к body для стилизации
            document.body.classList.add('browser-mode');
            console.log('🌐 Приложение открыто в браузере');
        } else {
            document.body.classList.add('webapp-mode');
            console.log('📱 Приложение открыто в Telegram WebApp');
        }
    }

    setupEventListeners() {
        // Обработчик для кнопки создания календаря
        document.getElementById('create-calendar-btn')?.addEventListener('click', () => {
            this.components.settings.handleFormSubmit();
        });

        // Обработчик для ссылки автора
        document.getElementById('author-link')?.addEventListener('click', () => {
            this.components.footer.toggleHiddenContent();
        });
    }
}

// Сделаем экземпляр приложения глобально доступным
let app;

// Инициализация приложения после полной загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    // Создаем экземпляр приложения
    app = new App();
    window.app = app; // Для доступа из консоли
    
    // Добавляем глобальные функции для совместимости
    window.changeLanguage = (lang) => app.components.settings.handleLanguageChange(lang);
    window.changeTheme = (theme) => app.components.settings.handleThemeChange(theme);
});
