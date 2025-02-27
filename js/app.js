import { TelegramService } from './services/TelegramService.js';
import { Calendar } from './components/Calendar.js';
import { DatePicker } from './components/DatePicker.js';
import { Settings } from './components/Settings.js';
import { Footer } from './components/Footer.js';

class App {
    constructor() {
        // Инициализация компонентов
        this.initComponents();
        
        // Делаем приложение доступным глобально для других компонентов
        window.app = this;

        // Настраиваем основную логику приложения
        this.setupMainLogic();
        
        // Оптимизация UI и производительности
        this.setupUIOptimizations();
        
        // Журналирование платформы
        this.logPlatformInfo();
    }
    
    initComponents() {
        this.telegram = new TelegramService();
        
        // Инициализация только критически важных компонентов в конструкторе
        this.components = {
            calendar: new Calendar('#lifeCanvas'),
            settings: new Settings('#settingsForm'),
            datePicker: new DatePicker('#birthdate-input'),
            footer: new Footer('.footer')
        };
    }

    setupMainLogic() {
        // Инициализация Telegram прежде всего
        this.telegram.init();

        // Модульная инициализация компонентов
        this.initializeComponents();
        
        // Настройка обработчиков событий
        this.setupEventListeners();
        
        // Применение настроек и стилей соответствующей платформы
        this.applyPlatformSettings();
    }
    
    initializeComponents() {
        // Инициализация компонентов в правильном порядке зависимостей
        this.components.calendar.init();
        
        // Затем инициализируем настройки и восстанавливаем состояние календаря
        this.components.settings.init();
        
        // Инициализация менее критичных компонентов
        this.components.datePicker.init();
        
        // Отложенная инициализация футера для лучшей производительности
        requestIdleCallback(() => {
            this.components.footer.init();
        }, { timeout: 1000 });
    }

    setupEventListeners() {
        // Используем делегирование событий где возможно
        document.addEventListener('change', e => {
            // Обработка изменения даты
            if (e.target.id === 'birthdate-input') {
                this.handleBirthdateChange(e.target.value);
            }
        });

        // Обработчик для кнопки создания календаря
        const createButton = document.getElementById('create-calendar-btn');
        if (createButton) {
            createButton.addEventListener('click', () => 
                this.components.settings.handleFormSubmit());
        }
    }
    
    handleBirthdateChange(birthdate) {
        if (birthdate && this.components.datePicker.isValidDate(birthdate)) {
            const livedWeeks = this.components.settings.calculateLivedWeeks(birthdate);
            this.components.calendar.draw(livedWeeks);
        }
    }
    
    applyPlatformSettings() {
        // Применение классов и стилей в зависимости от платформы
        if (!this.telegram.isTelegramWebApp()) {
            document.body.classList.add('browser-mode');
            requestIdleCallback(() => {
                this.components.settings.showBrowserNotice();
            });
        } else {
            document.body.classList.add('webapp-mode');
            document.body.classList.add('is-telegram');
        }
    }
    
    setupUIOptimizations() {
        // Оптимизация обработки скролла
        this.optimizeScrolling();
        
        // Отложенная загрузка неважных компонентов
        this.deferNonCriticalOperations();
    }
    
    optimizeScrolling() {
        let scrollTimeout;
        let isScrolling = false;
        
        // Использование пассивных слушателей для улучшения производительности
        window.addEventListener('scroll', () => {
            if (!isScrolling) {
                isScrolling = true;
                document.body.classList.add('is-scrolling');
            }
            
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                isScrolling = false;
                document.body.classList.remove('is-scrolling');
            }, 150);
        }, { passive: true });
    }
    
    deferNonCriticalOperations() {
        // Используем IntersectionObserver для ленивой загрузки
        if ('IntersectionObserver' in window) {
            const lazyElements = document.querySelectorAll('.lazy-load');
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('loaded');
                        observer.unobserve(entry.target);
                    }
                });
            });
            
            lazyElements.forEach(el => observer.observe(el));
        }
    }
    
    logPlatformInfo() {
        if (!this.telegram.isTelegramWebApp()) {
            console.log('🌐 Приложение открыто в браузере');
        } else {
            console.log('📱 Приложение открыто в Telegram WebApp');
        }
    }
}

// Загружаем приложение после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    // Используем requestAnimationFrame для оптимального старта
    requestAnimationFrame(() => {
        const app = new App();
        
        // Экспортируем публичные методы для глобального доступа
        window.changeLanguage = (lang) => app.components.settings.handleLanguageChange(lang);
        window.changeTheme = (theme) => app.components.settings.handleThemeChange(theme);
    });
});
