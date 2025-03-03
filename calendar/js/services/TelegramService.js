export class TelegramService {
    constructor() {
        // Инициализация Telegram WebApp API
        this.tg = window.Telegram?.WebApp;
        this.isAvailable = Boolean(this.tg);
        this.apiBaseUrl = '/calendar/api';  // без слеша в конце
        
        // Генерируем ID пользователя
        this.userId = this.getUserId();
    }
    
    // Проверка доступности Telegram
    isTelegramWebApp() {
        return this.isAvailable;
    }
    
    // Получение ID пользователя
    getUserId() {
        // Пробуем получить ID из Telegram
        if (this.isAvailable && this.tg.initDataUnsafe?.user?.id) {
            return this.tg.initDataUnsafe.user.id.toString();
        }
        
        // Если нет Telegram, используем уникальный ID из localStorage
        let localId = localStorage.getItem('userId');
        if (!localId) {
            localId = `web_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
            localStorage.setItem('userId', localId);
        }
        
        return localId;
    }
    
    // Проверка здоровья API
    async checkApiHealth() {
        try {
            console.log('Checking API health');
            const response = await fetch(`${this.apiBaseUrl}/health`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            console.log('Health check response:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            return data && (data.status === 'healthy' || data.status === 'OK');
        } catch (error) {
            console.warn('API Health check failed:', error);
            return false;
        }
    }
    
    // Отправка данных о дате рождения
    async sendBirthdateToApi(birthdate) {
        if (!this.isAvailable || !this.userId || this.userId.startsWith('web_')) {
            console.log('Telegram WebApp не доступен или отсутствует корректный ID пользователя, пропускаем отправку данных.');
            return;
        }

        try {
            const payload = {
                event_type: 'birthday',
                payload: {
                    telegram_id: this.userId,
                    date: birthdate
                }
            };
            
            console.log('Sending birthdate data:', payload);
            
            const response = await fetch(this.apiBaseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            
            console.log('API response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.warn('Error sending birthdate to API:', error);
            throw error;
        }
    }
}
