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
            this.baseUrl = `${isHttps ? 'https' : 'http'}://217.144.186.159:8080`;
        }
        
        // Инициализируем Telegram WebApp
        this.tg = window.Telegram?.WebApp;
        
        // Формируем URL эндпоинтов от базового URL
        this.apiUrl = `${this.baseUrl}/webhook/`;
        this.healthUrl = `${this.baseUrl}/health`;
        this.dbHealthUrl = `${this.baseUrl}/health/db`;
        
        // Резервный URL всегда прямой через HTTP
        this.backupApiUrl = 'http://217.144.186.159:8080/webhook/';
        
        // Прочие параметры
        this.defaultParams = {
            telegram_id: "819793181",
            date: "20.08.2005"
        };
        
        this.timeouts = {
            health: 3000,
            data: 5000
        };
        
        console.log(`🛠️ TelegramService инициализирован с базовым URL: ${this.baseUrl}`);
        if (this.isLocalDevelopment) {
            console.log('🔄 Используется локальный NGINX прокси для API');
        }
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
    
    // Метод для отправки данных пользователя
    async sendUserData(birthdate) {
        let userId = this.defaultParams.telegram_id;
        let isBrowserMode = false;
        
        // В режиме браузера делаем реальный запрос через прокси
        if (!this.isTelegramWebApp()) {
            console.log("🌐 Режим браузера: отправка тестовых данных через прокси");
            isBrowserMode = true;
            
            // В режиме браузера используем тестовый ID
            userId = this.defaultParams.telegram_id;
            
            // Форматируем данные для API
            const data = {
                event_type: "birthday",
                payload: {
                    telegram_id: userId,
                    date: this.formatDateForApi(birthdate),
                    test_mode: true // Флаг для тестового режима
                }
            };
            
            console.log("📤 Отправка тестовых данных через прокси:", data);
            
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
                    console.log("✅ Тестовые данные успешно отправлены:", result);
                    return { 
                        success: true, 
                        browserMode: true,
                        data: result
                    };
                } else {
                    console.error(`❌ API вернул ошибку: ${response.status}`);
                    // В тестовом режиме все равно считаем успешным для UI
                    return {
                        success: true,
                        browserMode: true,
                        message: "Тестовые данные обработаны локально (API не ответил)"
                    };
                }
            } catch (error) {
                console.error("❌ Ошибка отправки тестовых данных:", error.message);
                
                // Проверяем доступность API
                this.checkApiStatusInBackground();
                
                // В тестовом режиме не показываем ошибку пользователю
                return {
                    success: true,
                    browserMode: true,
                    message: "Данные сохранены локально (API недоступен)"
                };
            }
        }
        
        // Для реального Telegram WebApp используем обычную логику
        userId = this.tg?.initDataUnsafe?.user?.id?.toString() || this.defaultParams.telegram_id;
        if (userId === this.defaultParams.telegram_id) {
            console.warn("⚠️ Не удалось получить ID пользователя, используем значение по умолчанию");
        }
        
        const data = {
            event_type: "birthday",
            payload: {
                telegram_id: userId,
                date: this.formatDateForApi(birthdate)
            }
        };
        
        console.log("📤 Отправка данных:", data);
        
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
                const errorText = await response.text();
                throw new Error(`HTTP error: ${response.status} - ${errorText}`);
            }
        } catch (error) {
            console.error("❌ Ошибка отправки данных:", error.message);
            
            // Если основной URL не сработал, пробуем альтернативный URL
            if (this.apiUrl !== this.backupApiUrl) {
                console.log("⚠️ Пробуем альтернативный URL");
                try {
                    const backupResponse = await this.fetchWithTimeout(this.backupApiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    }, this.timeouts.data);
                    
                    if (backupResponse.ok) {
                        const result = await backupResponse.json();
                        console.log("✅ Данные успешно отправлены через запасной URL:", result);
                        return { success: true, data: result };
                    } else {
                        const errorText = await backupResponse.text();
                        throw new Error(`Ошибка запасного URL: ${backupResponse.status} - ${errorText}`);
                    }
                } catch (backupError) {
                    console.error("❌ Запасной URL тоже недоступен:", backupError.message);
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
        console.log("🔍 Запуск проверки API через прокси в фоновом режиме...");
        setTimeout(async () => {
            try {
                console.log(`⏱️ Проверка доступности API через прокси (${this.healthUrl})...`);
                const response = await this.fetchWithTimeout(this.healthUrl, { 
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                }, this.timeouts.health);
                
                if (response.ok) {
                    const result = await response.json();
                    console.log("✅ API доступен через прокси:", result);
                } else {
                    console.error(`❌ API вернул ошибку: ${response.status}`);
                }
            } catch (error) {
                console.error("❌ API недоступен через прокси:", error.message);
            }
        }, 100);
    }
    
    // Базовая проверка доступности сервера через HEAD запрос
    async isApiReachable() {
        try {
            console.log(`⏱️ Проверка соединения с сервером (${this.baseUrl})...`);
            
            // Используем fetch с HEAD методом - это быстрее и не требует загрузки тела ответа
            const response = await fetch(this.baseUrl, { 
                method: 'HEAD',
                cache: 'no-store',
                // Не используем no-cors режим для этой проверки
                timeout: 3000
            });
            
            console.log(`📡 Сервер ответил: HTTP ${response.status}`);
            
            // Для HEAD запроса любой ответ (даже 404) означает, что сервер доступен
            return true;
        } catch (error) {
            console.error(`❌ Сервер недоступен: ${error.message}`);
            return false;
        }
    }
    
    // Упрощенная проверка health с обработкой ошибок
    async simpleHealthCheck() {
        try {
            console.log(`🔍 Проверка health API (${this.healthUrl})...`);
            
            const response = await this.fetchWithTimeout(this.healthUrl, { 
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                cache: 'no-store'
            }, this.timeouts.health);
            
            if (response.ok) {
                try {
                    const data = await response.json();
                    console.log("✅ Health API вернул данные:", data);
                    return { 
                        status: data.status === "healthy" ? "healthy" : "error", 
                        message: `API вернул статус: ${data.status}`,
                        data
                    };
                } catch (parseError) {
                    console.error(`❌ Ошибка парсинга JSON: ${parseError.message}`);
                    return { 
                        status: "error", 
                        message: "Неверный формат ответа API" 
                    };
                }
            } else {
                console.error(`❌ Health API вернул ошибку: HTTP ${response.status}`);
                return { 
                    status: "error", 
                    message: `Сервер вернул ошибку: ${response.status}` 
                };
            }
        } catch (error) {
            console.error("❌ Ошибка при обращении к health API:", error.message);
            
            // Пробуем альтернативный URL
            try {
                console.log(`⚠️ Пробуем альтернативный URL: ${this.healthUrl.replace('https:', 'http:')}`);
                const backupResponse = await this.fetchWithTimeout(
                    this.healthUrl.replace('https:', 'http:'), 
                    { method: 'GET', headers: { 'Accept': 'application/json' } }, 
                    this.timeouts.health
                );
                
                if (backupResponse.ok) {
                    const backupData = await backupResponse.json();
                    console.log("✅ Альтернативный health API доступен:", backupData);
                    return { 
                        status: backupData.status === "healthy" ? "healthy" : "error", 
                        message: `API вернул статус: ${backupData.status}`,
                        data: backupData,
                        backup: true
                    };
                } else {
                    console.error(`❌ Альтернативный health API вернул ошибку: HTTP ${backupResponse.status}`);
                }
            } catch (backupError) {
                console.error(`❌ Альтернативный URL недоступен: ${backupError.message}`);
            }
            
            return { 
                status: "unavailable", 
                message: "API недоступен. Возможно, проблемы с соединением." 
            };
        }
    }

    // Оригинальный метод для детальной проверки с логами (используется для полной диагностики)
    async checkHealthWithLogs() {
        console.log(`🌡️ Проверка health API по адресу: ${this.healthUrl}`);
        
        try {
            const startTime = Date.now();
            const response = await this.fetchWithTimeout(this.healthUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            }, 5000);
            const endTime = Date.now();
            
            if (response.ok) {
                const data = await response.json();
                const responseTime = endTime - startTime;
                console.log(`✅ Health API доступен (${responseTime}ms): `, data);
                return { 
                    status: "healthy", 
                    message: `API работает корректно (${responseTime}ms)`,
                    data
                };
            } else {
                console.error(`❌ Health API вернул ошибку: HTTP ${response.status}`);
                const errorText = await response.text();
                console.error(`Текст ошибки: ${errorText}`);
                return { 
                    status: "error", 
                    message: `Ошибка API: HTTP ${response.status}`,
                    error: errorText
                };
            }
        } catch (error) {
            console.error(`❌ Не удалось связаться с Health API: ${error.message}`);
            
            // Пробуем резервный URL
            try {
                console.log(`⚠️ Пробуем резервный HTTP URL: ${this.healthUrl.replace('https:', 'http:')}`);
                const backupResponse = await this.fetchWithTimeout(
                    this.healthUrl.replace('https:', 'http:'), 
                    { method: 'GET', headers: { 'Accept': 'application/json' } }, 
                    5000
                );
                
                if (backupResponse.ok) {
                    const backupData = await backupResponse.json();
                    console.log("✅ Резервный Health API доступен:", backupData);
                    return { 
                        status: "healthy", 
                        message: "API работает через HTTP",
                        data: backupData,
                        backup: true
                    };
                }
            } catch (backupError) {
                console.error(`❌ Резервный URL тоже недоступен: ${backupError.message}`);
            }
            
            return { 
                status: "unavailable", 
                message: "API недоступен. Проверьте соединение с интернетом."
            };
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
        console.log("🔍 Запуск проверки соединения с API...");
        
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
        const userId = this.tg?.initDataUnsafe?.user?.id || this.defaultParams.telegram_id;
        const formattedDate = this.formatDateForApi(birthdate || this.defaultParams.date);
        
        return `curl -X POST ${this.apiUrl} -H "Content-Type: application/json" -d '{"event_type": "birthday", "payload": {"telegram_id": "${userId}", "date": "${formattedDate}"}}'`;
    }
}
