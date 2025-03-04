import { Calendar } from './components/Calendar.js';
import { DatePicker } from './components/DatePicker.js';
import { Settings } from './components/Settings.js';
import { Footer } from './components/Footer.js';

class App {
    constructor() {
        // Инициализация компонентов
        this.initComponents();
        
        // Делаем приложение доступным глобально
        window.app = this;

        // Настраиваем основную логику приложения
        this.setupMainLogic();
    }
    
    initComponents() {
        // Только нужные компоненты
        this.components = {
            calendar: new Calendar('#lifeCanvas'),
            settings: new Settings('#settingsForm'),
            datePicker: new DatePicker('#birthdate-input'),
            footer: new Footer('.footer')
        };
    }

    setupMainLogic() {
        // Инициализация компонентов
        this.components.settings.init();
        this.components.calendar.init();
        this.components.datePicker.init();
        this.components.footer.init();
        
        // Настройка обработчиков событий
        this.setupEventListeners();

        // Восстанавливаем состояние календаря при загрузке
        this.components.settings.restoreCalendarState();
    }
    
    setupEventListeners() {
        // Слушаем изменение даты
        document.getElementById('birthdate-input')?.addEventListener('change', (e) => {
            const birthdate = e.target.value;
            if (birthdate && this.components.datePicker.isValidDate(birthdate)) {
                const livedWeeks = this.components.settings.calculateLivedWeeks(birthdate);
                this.components.calendar.draw(livedWeeks);
            }
        });

        // Кнопка создания календаря
        document.getElementById('create-calendar-btn')?.addEventListener('click', () => {
            this.components.settings.handleFormSubmit();
        });
    }
}

// Загружаем приложение после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
