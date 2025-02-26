export class TelegramService {
    constructor() {
        this.tg = window.Telegram?.WebApp;
        this.apiUrl = 'https://217.144.186.159:8080/webhook';
        this.backupApiUrl = 'http://217.144.186.159:8080/webhook';
        this.defaultParams = {
            telegram_id: "819793181",
            date: "20.08.2005"
        };
    }

    init() {
        if (!this.tg) {
            console.log("🌐 Режим браузера");
            return;
        }

        this.tg.expand();
        this.tg.ready();

        // Логируем данные пользователя для диагностики
        if (this.tg?.initDataUnsafe?.user) {
            console.log("👤 User ID:", this.tg.initDataUnsafe.user.id);
            console.log("📱 Platform:", this.tg.platform);
            console.log("📊 Version:", this.tg.version);
        }
    }

    isTelegramWebApp() {
        return Boolean(
            this.tg?.initDataUnsafe?.user?.id &&
            this.tg?.initData &&
            this.tg?.platform !== 'unknown'
        );
    }
    
    // Простой метод для отправки данных пользователя
    async sendUserData(birthdate) {
        // В браузере имитируем успешную отправку
        if (!this.isTelegramWebApp()) {
            console.log("🌐 Режим браузера: имитация отправки данных");
            return { 
                success: true, 
                browserMode: true
            };
        }
        
        let userId = this.tg?.initDataUnsafe?.user?.id?.toString();
        
        // Если нет ID пользователя, используем значение по умолчанию
        if (!userId) {
            userId = this.defaultParams.telegram_id;
            console.warn("⚠️ Не удалось получить ID пользователя, используем значение по умолчанию");
        }
        
        const data = {
            telegram_id: userId,
            date: birthdate
        };
        
        console.log("📤 Отправка данных:", data);
        
        try {
            // Пробуем основной URL (HTTPS)
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log("✅ Данные успешно отправлены:", result);
                
                // Отправляем результат обратно в Telegram
                if (this.tg?.sendData) {
                    this.tg.sendData(JSON.stringify({
                        type: "success",
                        data: result
                    }));
                }
                
                return { success: true, data: result };
            } else {
                throw new Error(`HTTP error: ${response.status}`);
            }
        } catch (error) {
            console.error("❌ Ошибка отправки данных через HTTPS:", error.message);
            
            try {
                // Если HTTPS не сработал, пробуем HTTP
                const backupResponse = await fetch(this.backupApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                if (backupResponse.ok) {
                    const result = await backupResponse.json();
                    console.log("✅ Данные успешно отправлены через HTTP:", result);
                    return { success: true, data: result };
                } else {
                    throw new Error(`HTTP error: ${backupResponse.status}`);
                }
            } catch (backupError) {
                // Отображаем информацию для диагностики
                const errorMessage = `Ошибка отправки данных: ${backupError.message}. ID: ${userId}`;
                console.error("❌", errorMessage);
                
                return { 
                    success: false, 
                    error: errorMessage,
                    userId: userId
                };
            }
        }
    }

    // Упрощенный метод для быстрого тестирования соединения
    async testConnection() {
        const userId = this.tg?.initDataUnsafe?.user?.id || this.defaultParams.telegram_id;
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    telegram_id: userId.toString(),
                    date: this.defaultParams.date
                })
            });
            
            return response.ok;
        } catch (error) {
            console.error("❌ Тест соединения не удался:", error.message);
            return false;
        }
    }
    
    // Метод для получения curl-команды для ручного тестирования
    getCurlCommand(birthdate) {
        const userId = this.tg?.initDataUnsafe?.user?.id || this.defaultParams.telegram_id;
        return `curl -X POST ${this.apiUrl} -H "Content-Type: application/json" -d '{"telegram_id": "${userId}", "date": "${birthdate || this.defaultParams.date}"}'`;
    }
}
