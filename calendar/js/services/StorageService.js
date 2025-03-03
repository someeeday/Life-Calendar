export class StorageService {
    constructor() {
        this.defaultSettings = {
            theme: 'light',   // Светлая тема по умолчанию
            language: 'ru',   // Русский язык по умолчанию
            birthdate: ''     // Пустая дата по умолчанию
        };
        
        try {
            // Проверяем доступность localStorage
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            this.storage = localStorage;
        } catch (e) {
            console.warn('localStorage недоступен, используем временное хранилище');
            this.storage = this.createMemoryStorage();
        }
        
        // Инициализация дефолтных значений при первом запуске
        this.initDefaultValues();
    }
    
    // Создаём хранилище в памяти если localStorage недоступен
    createMemoryStorage() {
        const data = {};
        return {
            getItem: (key) => data[key] || null,
            setItem: (key, value) => { data[key] = String(value); },
            removeItem: (key) => { delete data[key]; },
            clear: () => { Object.keys(data).forEach(key => delete data[key]); }
        };
    }
    
    // Установка начальных значений для настроек
    initDefaultValues() {
        Object.entries(this.defaultSettings).forEach(([key, defaultValue]) => {
            const value = this.storage.getItem(key);
            if (value === null || value === undefined) {
                this.storage.setItem(key, defaultValue);
            }
        });
    }
    
    // Получение всех настроек как объект
    getAllSettings() {
        return {
            theme: this.getSetting('theme'),
            language: this.getSetting('language'),
            birthdate: this.getSetting('birthdate')
        };
    }
    
    // Получение значения настройки
    getSetting(key) {
        const value = this.storage.getItem(key);
        return value !== null ? value : this.defaultSettings[key];
    }
    
    // Сохранение значений настроек
    saveSettings(settings = {}) {
        try {
            Object.entries(settings).forEach(([key, value]) => {
                this.storage.setItem(key, value);
            });
            return true;
        } catch (error) {
            console.error('Settings save error:', error);
            return false;
        }
    }
    
    // Сохранение значения настройки
    setSetting(key, value) {
        try {
            if (value !== null && value !== undefined) {
                this.storage.setItem(key, value);
                return true;
            }
            return false;
        } catch (error) {
            console.error(`Error saving ${key}:`, error);
            return false;
        }
    }
    
    // Удаление настройки
    removeSetting(key) {
        this.storage.removeItem(key);
    }
    
    // Очистка всех настроек
    clearSettings() {
        this.storage.clear();
        this.initDefaultValues();
    }
}
