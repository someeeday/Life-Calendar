export class TelegramService {
    constructor() {
        this.tg = window.Telegram?.WebApp;
        // Обновляем на HTTPS-адрес для большей безопасности и надёжности
        this.apiUrl = 'https://217.144.186.159:8080/webhook';
        this.backupApiUrl = 'http://217.144.186.159:8080/webhook'; // Бэкап URL для HTTP
        this.callbacks = new Map();
        this.maxRetries = 3; // Максимальное количество повторных попыток
        this.currentApiUrl = this.apiUrl; // Активный URL для запросов
        this.connectionTested = false;
    }

    init() {
        if (!this.tg) {
            // В браузере только логируем режим без предупреждений
            console.log("🌐 Режим браузера");
            return;
        }

        this.tg.expand();
        this.tg.ready();

        // Показываем сообщения о пользователе только в WebApp
        if (this.isTelegramWebApp()) {
            if (this.tg.initDataUnsafe?.user) {
                console.log("✅ Web App открыт в Telegram");
                console.log("👤 User ID:", this.tg.initDataUnsafe.user.id);
            } else {
                console.warn("⚠ Telegram не передал данные пользователя");
            }

            // Расширенное логирование только для WebApp
            console.log("🔍 Проверка окружения:");
            console.log("Platform:", this.tg.platform);
            console.log("Version:", this.tg.version);
            console.log("InitData:", this.tg.initData);
        }
        
        // Тестируем соединение в фоне
        this.testServerConnection();
    }

    isTelegramWebApp() {
        return Boolean(
            this.tg?.initDataUnsafe?.user?.id &&
            this.tg?.initData &&
            this.tg?.platform !== 'unknown' &&
            this.tg?.version
        );
    }
    
    async testServerConnection() {
        try {
            // Пингуем основной URL
            const response = await fetch(this.apiUrl, {
                method: 'HEAD',
                // Таймаут 5 секунд для проверки
                signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
                console.log("✅ API сервер доступен");
                this.currentApiUrl = this.apiUrl;
                this.connectionTested = true;
                return true;
            }
        } catch (error) {
            console.log("⚠️ Основной API недоступен, пробуем запасной URL");
            
            try {
                // Пробуем запасной HTTP URL
                const backupResponse = await fetch(this.backupApiUrl, {
                    method: 'HEAD',
                    signal: AbortSignal.timeout(5000)
                });
                
                if (backupResponse.ok) {
                    console.log("✅ Запасной API сервер доступен");
                    this.currentApiUrl = this.backupApiUrl;
                    this.connectionTested = true;
                    return true;
                }
            } catch (backupError) {
                console.error("❌ Все API серверы недоступны:", backupError);

            return { success: true, data: result };

        } catch (error) {
            console.error("❌ Ошибка отправки данных:", error);
            
            // Отправляем ошибку в Telegram WebApp
            if (this.tg?.sendData) {
                this.tg.sendData(JSON.stringify({
                    type: "register",
                    status: "error",
                    error: error.message
                }));
            }

            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    // Метод для тестирования API без Telegram
    async testApiConnection(userId, birthdate) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    telegram_id: userId.toString(),
                    date: birthdate
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log("✅ Тестовое подключение успешно:", result);
            return { success: true, data: result };

        } catch (error) {
            console.error("❌ Ошибка тестового подключения:", error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    #handleError(error) {
        console.error('WebApp error:', error);
        if (this.tg?.sendData) {
            this.tg.sendData(JSON.stringify({
                type: "error",
                error: error.message
            }));
        }
    }
}
