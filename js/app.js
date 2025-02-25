import { TelegramService } from './services/TelegramService';
import { Calendar } from './components/Calendar';
import { DatePicker } from './components/DatePicker';
import { Settings } from './components/Settings';
import { Footer } from './components/Footer';

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
    }

    init() {
        this.telegram.init();
        Object.values(this.components).forEach(component => component.init());
        
        if (!this.telegram.isTelegramWebApp()) {
            this.components.settings.showBrowserNotice();
        }
    }
}

// Инициализация приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
