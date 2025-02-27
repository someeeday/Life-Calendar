export class StorageService {
    constructor() {
        this.isTelegram = typeof window.Telegram !== 'undefined';
        this.storage = this.isTelegram ? window.Telegram.WebApp.storage : window.localStorage;
        this.defaultSettings = {
            theme: 'light',
            language: 'ru',
            birthdate: ''
        };
    }

    saveSettings(settings) {
        try {
            Object.entries(settings).forEach(([key, value]) => {
                this.storage.setItem(key, value);
            });
            return true;
        } catch (error) {
            console.error('Ошибка сохранения настроек:', error);
            return false;
        }
    }

    loadSettings() {
        try {
            return {
                theme: this.storage.getItem('theme') || this.defaultSettings.theme,
                language: this.storage.getItem('language') || this.defaultSettings.language,
                birthdate: this.storage.getItem('birthdate') || this.defaultSettings.birthdate
            };
        } catch (error) {
            console.error('Ошибка загрузки настроек:', error);
            return this.defaultSettings;
        }
    }

    getSetting(key) {
        try {
            return this.storage.getItem(key) || this.defaultSettings[key];
        } catch (error) {
            console.error(`Ошибка получения настройки ${key}:`, error);
            return this.defaultSettings[key];
        }
    }

    setSetting(key, value) {
        try {
            this.storage.setItem(key, value);
            return true;
        } catch (error) {
            console.error(`Ошибка установки настройки ${key}:`, error);
            return false;
        }
    }

    clearSettings() {
        try {
            this.storage.clear();
            return true;
        } catch (error) {
            console.error('Ошибка очистки настроек:', error);
            return false;
        }
    }

    removeSetting(key) {
        try {
            this.storage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Ошибка удаления настройки ${key}:`, error);
            return false;
        }
    }

    hasSettings() {
        return this.storage.length > 0;
    }

    isStorageAvailable() {
        try {
            const testKey = '__storage_test__';
            this.storage.setItem(testKey, testKey);
            this.storage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    }
}
