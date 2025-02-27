export class StorageService {
    constructor() {
        this.defaultSettings = {
            theme: 'light',
            language: 'ru',
            birthdate: ''
        };
        
        // Инициализация хранилища с проверкой доступности
        this.initStorage();
    }

    initStorage() {
        try {
            // Проверяем доступность Telegram WebApp
            const isTelegram = typeof window.Telegram !== 'undefined';
            
            // Пытаемся использовать лучшее доступное хранилище
            if (isTelegram && window.Telegram?.WebApp?.storage) {
                this.storage = window.Telegram.WebApp.storage;
            } else {
                // Последовательно проверяем localStorage, sessionStorage
                this.storage = this.isStorageAvailable('localStorage') 
                    ? window.localStorage 
                    : (this.isStorageAvailable('sessionStorage') ? window.sessionStorage : null);
            }
            
            // Если хранилище недоступно - используем in-memory решение
            if (!this.storage) {
                this.createInMemoryStorage();
                console.warn('External storage unavailable, using in-memory storage');
            }
        } catch (error) {
            console.error('Storage initialization error:', error);
            this.createInMemoryStorage();
        }
    }
    
    isStorageAvailable(type) {
        try {
            const storage = window[type];
            const testKey = '__storage_test__';
            storage.setItem(testKey, testKey);
            const result = storage.getItem(testKey) === testKey;
            storage.removeItem(testKey);
            return result;
        } catch (e) {
            return false;
        }
    }

    createInMemoryStorage() {
        const memStorage = {};
        this.storage = {
            getItem: key => memStorage[key] ?? null,
            setItem: (key, value) => { memStorage[key] = String(value); },
            removeItem: key => { delete memStorage[key]; },
            clear: () => { Object.keys(memStorage).forEach(key => delete memStorage[key]); },
            get length() { return Object.keys(memStorage).length; }
        };
    }

    // Базовые методы для работы с хранилищем
    saveSettings(settings = {}) {
        if (!this.storage) return false;
        
        try {
            Object.entries(settings).forEach(([key, value]) => 
                this.storage.setItem(key, value));
            return true;
        } catch (error) {
            console.error('Settings save error:', error);
            return false;
        }
    }

    loadSettings() {
        if (!this.storage) return this.defaultSettings;
        
        try {
            return {
                theme: this.storage.getItem('theme') || this.defaultSettings.theme,
                language: this.storage.getItem('language') || this.defaultSettings.language,
                birthdate: this.storage.getItem('birthdate') || this.defaultSettings.birthdate
            };
        } catch (error) {
            console.error('Settings load error:', error);
            return this.defaultSettings;
        }
    }

    getSetting(key) {
        if (!this.storage || !key) return this.defaultSettings[key];
        
        try {
            return this.storage.getItem(key) || this.defaultSettings[key] || null;
        } catch (error) {
            return this.defaultSettings[key] || null;
        }
    }

    setSetting(key, value) {
        if (!this.storage || !key) return false;
        
        try {
            this.storage.setItem(key, value);
            return true;
        } catch (error) {
            console.error(`Error setting ${key}:`, error);
            return false;
        }
    }

    clearSettings() {
        if (!this.storage) return false;
        
        try {
            this.storage.clear();
            return true;
        } catch (error) {
            return false;
        }
    }

    removeSetting(key) {
        if (!this.storage || !key) return false;
        
        try {
            this.storage.removeItem(key);
            return true;
        } catch (error) {
            return false;
        }
    }

    hasSettings() {
        return this.storage && this.storage.length > 0;
    }
}
