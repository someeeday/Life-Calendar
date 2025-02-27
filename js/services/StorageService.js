export class StorageService {
    constructor() {
        this.isTelegram = typeof window.Telegram !== 'undefined';
        try {
            // Проверяем доступность Telegram.WebApp и его хранилища
            if (this.isTelegram && window.Telegram?.WebApp?.storage) {
                this.storage = window.Telegram.WebApp.storage;
            } else {
                // Если не в Telegram или нет хранилища WebApp, используем localStorage
                this.storage = window.localStorage || sessionStorage;
            }
        } catch (error) {
            console.error('Ошибка инициализации хранилища:', error);
            // Резервный вариант - sessionStorage
            this.storage = window.sessionStorage;
        }
        
        this.defaultSettings = {
            theme: 'light',
            language: 'ru',
            birthdate: ''
        };
        
        // Проверка работоспособности хранилища
        if (!this.isStorageAvailable()) {
            console.warn('Хранилище недоступно, используем встроенные значения по умолчанию');
            // Создаем in-memory хранилище
            this.createInMemoryStorage();
        }
    }

    // Создает in-memory хранилище, если localStorage недоступен
    createInMemoryStorage() {
        this._inMemoryStorage = {};
        // Переопределяем методы
        this.storage = {
            getItem: (key) => this._inMemoryStorage[key] || null,
            setItem: (key, value) => { this._inMemoryStorage[key] = value; },
            removeItem: (key) => { delete this._inMemoryStorage[key]; },
            clear: () => { this._inMemoryStorage = {}; },
            get length() { return Object.keys(this._inMemoryStorage).length; }
        };
    }

    saveSettings(settings) {
        try {
            if (!this.storage) {
                console.error('Хранилище недоступно');
                return false;
            }
            
            Object.entries(settings).forEach(([key, value]) => {
                this.storage.setItem(key, value);
            });
            console.log('Настройки сохранены успешно:', settings);
            return true;
        } catch (error) {
            console.error('Ошибка сохранения настроек:', error);
            return false;
        }
    }

    loadSettings() {
        try {
            if (!this.storage) {
                console.error('Хранилище недоступно');
                return this.defaultSettings;
            }
            
            const settings = {
                theme: this.storage.getItem('theme') || this.defaultSettings.theme,
                language: this.storage.getItem('language') || this.defaultSettings.language,
                birthdate: this.storage.getItem('birthdate') || this.defaultSettings.birthdate
            };
            
            console.log('Загружены настройки:', settings);
            return settings;
        } catch (error) {
            console.error('Ошибка загрузки настроек:', error);
            return this.defaultSettings;
        }
    }

    getSetting(key) {
        try {
            if (!this.storage) {
                console.error('Хранилище недоступно');
                return this.defaultSettings[key];
            }
            
            const value = this.storage.getItem(key) || this.defaultSettings[key];
            return value;
        } catch (error) {
            console.error(`Ошибка получения настройки ${key}:`, error);
            return this.defaultSettings[key];
        }
    }

    setSetting(key, value) {
        try {
            if (!this.storage) {
                console.error('Хранилище недоступно');
                return false;
            }
            
            this.storage.setItem(key, value);
            console.log(`Настройка ${key} сохранена: ${value}`);
            return true;
        } catch (error) {
            console.error(`Ошибка установки настройки ${key}:`, error);
            return false;
        }
    }

    clearSettings() {
        try {
            if (!this.storage) {
                console.error('Хранилище недоступно');
                return false;
            }
            
            this.storage.clear();
            return true;
        } catch (error) {
            console.error('Ошибка очистки настроек:', error);
            return false;
        }
    }

    removeSetting(key) {
        try {
            if (!this.storage) {
                console.error('Хранилище недоступно');
                return false;
            }
            
            this.storage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Ошибка удаления настройки ${key}:`, error);
            return false;
        }
    }

    hasSettings() {
        return this.storage && this.storage.length > 0;
    }

    isStorageAvailable() {
        try {
            if (!this.storage) return false;
            
            const testKey = '__storage_test__';
            this.storage.setItem(testKey, testKey);
            const result = this.storage.getItem(testKey) === testKey;
            this.storage.removeItem(testKey);
            return result;
        } catch (error) {
            console.error('Ошибка проверки доступности хранилища:', error);
            return false;
        }
    }
}
