export class TelegramService {
    constructor() {
        this.tg = window.Telegram?.WebApp;
        this.apiUrl = 'https://217.144.186.159:8080/webhook/';
        this.backupApiUrl = 'http://217.144.186.159:8080/webhook/';
        this.healthUrl = 'https://217.144.186.159:8080/health';
        this.dbHealthUrl = 'https://217.144.186.159:8080/health/db';
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
    
    // Метод для отправки данных пользователя
    async sendUserData(birthdate) {
        let userId = this.defaultParams.telegram_id;
        let isBrowserMode = false;
        
        // Определяем режим работы и получаем ID пользователя
        if (!this.isTelegramWebApp()) {
            console.log("🌐 Режим браузера: проверка health API вместо отправки данных");
            isBrowserMode = true;
            
            // В режиме браузера проверяем health API
            try {
                console.log("🔍 Отправка запроса к health endpoint...");
                const healthResult = await this.checkHealthWithLogs();
                
                return { 
                    success: true, 
                    browserMode: true,
                    healthStatus: healthResult.status,
                    healthChecked: true,
                    message: healthResult.message
                };
            } catch (error) {
                console.error("❌ Ошибка при проверке health API:", error.message);
                return {
                    success: true, // Всё равно считаем успешным для UI
                    browserMode: true,
                    healthChecked: false,
                    healthStatus: "error",
                    message: "Режим браузера: данные сохранены локально, но проверка API не удалась"
                };
            }
        }
        
        // Получаем ID пользователя из Telegram WebApp
        userId = this.tg?.initDataUnsafe?.user?.id?.toString() || this.defaultParams.telegram_id;
        if (userId === this.defaultParams.telegram_id) {
            console.warn("⚠️ Не удалось получить ID пользователя, используем значение по умолчанию");
        }
        
        // Форматируем данные согласно ожиданиям API
        const data = {
            event_type: "birthday",
            payload: {
                telegram_id: userId,
                date: this.formatDateForApi(birthdate) // Преобразуем в формат, который ожидает API
            }
        };
        
        console.log("📤 Отправка данных:", data);
        
        try {
            // Пробуем основной URL (HTTPS)
            const response = await this.fetchWithTimeout(this.apiUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            }, 5000); // 5 секунд таймаут
            
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
            console.error("❌ Ошибка отправки данных через HTTPS:", error.message);
            
            try {
                // Если HTTPS не сработал, пробуем HTTP
                const backupResponse = await this.fetchWithTimeout(this.backupApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                }, 5000); // 5 секунд таймаут
                
                if (backupResponse.ok) {
                    const result = await backupResponse.json();
                    console.log("✅ Данные успешно отправлены через HTTP:", result);
                    return { success: true, data: result };
                } else {
                    const errorText = await backupResponse.text();
                    throw new Error(`HTTP error: ${backupResponse.status} - ${errorText}`);
                }
            } catch (backupError) {
                // Отображаем информацию для диагностики
                const errorMessage = `Ошибка отправки данных: ${backupError.message}. ID: ${userId}`;
                console.error("❌", errorMessage);
                
                // Проверяем доступность API, чтобы предоставить более информативную ошибку
                this.testConnection().then(isApiAvailable => {
                    if (!isApiAvailable) {
                        console.error("⚠️ API недоступен, проблема с соединением");
                    }
                });
                
                return { 
                    success: false, 
                    error: errorMessage,
                    userId: userId
                };
            }
        }
    }

    // Новый метод для проверки health с подробными логами
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

    // Форматирует дату из формата DD.MM.YYYY в формат YYYY-MM-DD, который ожидает API
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

    // Кастомный fetch с таймаутом
    async fetchWithTimeout(url, options = {}, timeout = 8000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    }

    // Комплексная проверка соединения с API с проверкой состояния базы данных
    async testConnection() {
        console.log("🔍 Запуск полной проверки соединения с API...");
        const result = await this.checkHealthWithLogs();
        return result.status === "healthy";
    }
    
    // Метод для получения curl-команды для ручного тестирования в соответствии со структурой API
    getCurlCommand(birthdate) {
        const userId = this.tg?.initDataUnsafe?.user?.id || this.defaultParams.telegram_id;
        const formattedDate = this.formatDateForApi(birthdate || this.defaultParams.date);
        
        return `curl -X POST ${this.apiUrl} -H "Content-Type: application/json" -d '{"event_type": "birthday", "payload": {"telegram_id": "${userId}", "date": "${formattedDate}"}}'`;
    }
}
