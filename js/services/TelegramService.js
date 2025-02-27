export class TelegramService {
    constructor() {
        // Детектируем локальную разработку и определяем базовые URL
        this.isLocalDevelopment = window.location.hostname === 'localhost' || 
                                 window.location.hostname === '127.0.0.1';
        
        // В режиме локальной разработки используем NGINX прокси на порту 8081
        if (this.isLocalDevelopment) {
            this.baseUrl = 'http://localhost:8081/api';
        } else {
            // В production используем прямой URL к API в зависимости от протокола
            const isHttps = window.location.protocol === 'https:';
            this.baseUrl = `${isHttps ? 'https' : 'http'}://someeeday.me/api`;
        }
        
        // Инициализируем Telegram WebApp
        this.tg = window.Telegram?.WebApp;
        
        // Формируем URL эндпоинтов от базового URL
        this.apiUrl = `${this.baseUrl}/webhook/`;
        this.healthUrl = `${this.baseUrl}/health`;
        this.dbHealthUrl = `${this.baseUrl}/health/db`;
        
        // Резервный URL всегда прямой через HTTP
        this.backupApiUrl = 'http://217.144.186.159:8080/webhook/';
        
        this.timeouts = {
            health: 3000,
            data: 5000
        };
    }

    init() {
        if (!this.tg) {
            console.log("🌐 Режим браузера");
            return;
        }

        this.tg.expand();
        this.tg.ready();
    }

    isTelegramWebApp() {
        return Boolean(
            this.tg?.initDataUnsafe?.user?.id &&
            this.tg?.initData &&
            this.tg?.platform !== 'unknown'
        );
    }
    
    // Метод для отправки данных пользователя
    async sendUserData(birthdate) {
        let userId;
        
        // В режиме браузера делаем реальный запрос через прокси
        if (!this.isTelegramWebApp()) {
            const isHealthy = await this.checkHealth();
            if (!isHealthy) {
                return {
                    success: false,
                    browserMode: true,
                    message: "Health API недоступен, данные не отправлены"
                };
            }
            
            // Форматируем данные для API
            const data = {
                event_type: "birthday",
                payload: {
                    telegram_id: userId,
                    date: this.formatDateForApi(birthdate)
                }
            };
            
            try {
                // Отправляем запрос через наш прокси
                const response = await this.fetchWithTimeout(this.apiUrl, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(data)
                }, this.timeouts.data);
                
                if (response.ok) {
                    const result = await response.json();
                    return { 
                        success: true, 
                        browserMode: true,
                        data: result
                    };
                } else {
                    return {
                        success: false,
                        browserMode: true,
                        message: "API вернул ошибку"
                    };
                }
            } catch (error) {
                this.checkApiStatusInBackground();
                return {
                    success: false,
                    browserMode: true,
                    message: "Ошибка отправки данных"
                };
            }
        }
        
        // Для реального Telegram WebApp используем обычную логику
        userId = this.tg?.initDataUnsafe?.user?.id?.toString();
        if (!userId) {
            return {
                success: false,
                message: "Не удалось получить ID пользователя"
            };
        }
        
        const data = {
            event_type: "birthday",
            payload: {
                telegram_id: userId,
                date: this.formatDateForApi(birthdate)
            }
        };
        
        return await this.sendDataWithRetry(data);
    }
    
    // Новый метод для отправки данных с повторными попытками
    async sendDataWithRetry(data) {
        // Пробуем основной URL
        try {
            const response = await this.fetchWithTimeout(this.apiUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            }, this.timeouts.data);
            
            if (response.ok) {
                const result = await response.json();
                
                // Отправляем результат обратно в Telegram
                if (this.tg?.sendData) {
                    this.tg.sendData(JSON.stringify({
                        type: "success",
                        data: result
                    }));
                }
                
                return { success: true, data: result };
            } else {
                const errorText = await response.text();
                throw new Error(`HTTP error: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            // Если основной URL не сработал, пробуем альтернативный URL
            if (this.apiUrl !== this.backupApiUrl) {
                try {
                    const backupResponse = await this.fetchWithTimeout(this.backupApiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    }, this.timeouts.data);
                    
                    if (backupResponse.ok) {
                        const result = await backupResponse.json();
                        return { success: true, data: result };
                    } else {
                        const errorText = await backupResponse.text();
                        throw new Error(`Ошибка запасного URL: ${backupResponse.status} - ${errorText}`);
                    }
                } catch (backupError) {
                    return { 
                        success: false, 
                        error: `Не удалось отправить данные: ${backupError.message}`,
                        userId: data.payload.telegram_id
                    };
                }
            }
            
            // Все попытки не удались
            return { 
                success: false, 
                error: `Не удалось отправить данные: ${error.message}`,
                userId: data.payload.telegram_id
            };
        }
    }
    
    // Метод для проверки статуса API в фоне без блокировки UI
    async checkApiStatusInBackground() {
        setTimeout(async () => {
            try {
                const response = await this.fetchWithTimeout(this.healthUrl, { 
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                }, this.timeouts.health);
                
                if (response.ok) {
                    const result = await response.json();
                }
            } catch (error) {
                // Обработка ошибки
            }
        }, 100);
    }
    
    // Базовая проверка доступности сервера через HEAD запрос
    async isApiReachable() {
        try {
            const response = await fetch(this.baseUrl, { 
                method: 'HEAD',
                cache: 'no-store',
                timeout: 3000
            });
            
            return true;
        } catch (error) {
            return false;
        }
    }
    
    // Упрощенная проверка health с обработкой ошибок
    async simpleHealthCheck() {
        try {
            const response = await this.fetchWithTimeout(this.healthUrl, { 
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                cache: 'no-store'
            }, this.timeouts.health);
            
            if (response.ok) {
                try {
                    const data = await response.json();
                    return { 
                        status: data.status === "healthy" ? "healthy" : "error", 
                        message: `API вернул статус: ${data.status}`,
                        data
                    };
                } catch (parseError) {
                    return { 
                        status: "error", 
                        message: "Неверный формат ответа API" 
                    };
                }
            } else {
                return { 
                    status: "error", 
                    message: `Сервер вернул ошибку: ${response.status}` 
                };
            }
        } catch (error) {
            return { 
                status: "unavailable", 
                message: "API недоступен. Возможно, проблемы с соединением." 
            };
        }
    }

    async checkHealth() {
        try {
            const response = await this.fetchWithTimeout(this.healthUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            }, this.timeouts.health);

            if (response.ok) {
                const data = await response.json();
                if (!this.isTelegramWebApp()) {
                    console.log(`✅ Health API статус: ${data.status}`);
                }
                return data.status === "healthy";
            } else {
                if (!this.isTelegramWebApp()) {
                    console.error(`❌ Health API вернул ошибку: ${response.status}`);
                }
                return false;
            }
        } catch (error) {
            if (!this.isTelegramWebApp()) {
                console.error("❌ Ошибка при обращении к health API:", error.message);
            }
            return false;
        }
    }

    formatDateForApi(dateString) {
        // Если дата уже в нужном формате, возвращаем её
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
        }
        
        // Преобразуем DD.MM.YYYY в YYYY-MM-DD
        const parts = dateString.split('.');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        
        // Если формат не распознан, возвращаем исходную строку
        return dateString;
    }

    // Улучшенный fetch с таймаутом через AbortSignal для современных браузеров
    async fetchWithTimeout(url, options = {}, timeout = 8000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Request to ${url} timed out after ${timeout}ms`);
            }
            throw error;
        }
    }

    // Комплексная проверка соединения с API
    async testConnection() {
        // Сначала проверяем базовую доступность сервера
        const isReachable = await this.isApiReachable();
        if (!isReachable) {
            return false;
        }
        
        // Затем проверяем health API
        const result = await this.simpleHealthCheck();
        return result.status === "healthy";
    }
    
    getCurlCommand(birthdate) {
        const userId = this.tg?.initDataUnsafe?.user?.id;
        const formattedDate = this.formatDateForApi(birthdate);
        
        return `curl -X POST ${this.apiUrl} -H "Content-Type: application/json" -d '{"event_type": "birthday", "payload": {"telegram_id": "${userId}", "date": "${formattedDate}"}}'`;
    }
}
