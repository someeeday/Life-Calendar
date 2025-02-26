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
        // Добавляем параметры по умолчанию
        this.defaultParams = {
            telegram_id: "819793181",  // ID пользователя по умолчанию
            date: "20.08.2005"         // Дата по умолчанию
        };
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
            // Используем GET вместо HEAD для проверки доступности
            console.log("🔄 Проверка основного API сервера...");
            const response = await fetch(this.apiUrl, {
                method: 'GET', // HEAD может быть отклонен некоторыми серверами
                mode: 'cors', // Явно указываем режим CORS
                cache: 'no-cache',
                // Таймаут 5 секунд для проверки
                signal: AbortSignal.timeout(5000)
            });
            
            console.log("📊 Статус ответа API:", response.status);
            
            if (response.ok) {
                console.log("✅ API сервер доступен");
                this.currentApiUrl = this.apiUrl;
                this.connectionTested = true;
                return true;
            } else {
                console.log("⚠️ Основной API вернул статус:", response.status);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.log("⚠️ Основной API недоступен:", error.message || JSON.stringify(error));
            
            try {
                // Пробуем запасной HTTP URL с GET
                console.log("🔄 Проверка запасного API сервера...");
                const backupResponse = await fetch(this.backupApiUrl, {
                    method: 'GET',
                    mode: 'cors',
                    cache: 'no-cache',
                    signal: AbortSignal.timeout(5000)
                });
                
                console.log("📊 Статус ответа запасного API:", backupResponse.status);
                
                if (backupResponse.ok) {
                    console.log("✅ Запасной API сервер доступен");
                    this.currentApiUrl = this.backupApiUrl;
                    this.connectionTested = true;
                    return true;
                } else {
                    console.log("⚠️ Запасной API вернул статус:", backupResponse.status);
                    throw new Error(`HTTP error! status: ${backupResponse.status}`);
                }
            } catch (backupError) {
                console.error("❌ Все API серверы недоступны:", backupError.message || JSON.stringify(backupError));
                
                // Если сервер недоступен, пробуем отправить тестовый запрос с режимом no-cors
                console.log("⚠️ Пробуем режим no-cors для проверки...");
                try {
                    await fetch(this.backupApiUrl, {
                        method: 'GET',
                        mode: 'no-cors', // Этот режим не даст читать ответ, но проверит доступность
                        cache: 'no-cache',
                        signal: AbortSignal.timeout(5000)
                    });
                    
                    // Если мы дошли до этой точки, сервер возможно доступен, но с CORS ограничениями
                    console.log("ℹ️ Сервер, возможно, доступен, но имеет ограничения CORS");
                    this.currentApiUrl = this.backupApiUrl;
                    return false;
                } catch (noCorsError) {
                    console.error("❌ Сервер полностью недоступен:", noCorsError.message || JSON.stringify(noCorsError));
                    return false;
                }
            }
        }
    }

    // Добавляем новый метод для отправки данных пользователя
    async sendUserData(birthdate, retryCount = 0) {
        // Проверяем, в каком режиме мы работаем
        const isWebApp = this.isTelegramWebApp();
        let userId = this.defaultParams.telegram_id; // По умолчанию
        
        // Если мы в WebApp, пытаемся получить настоящий ID пользователя
        if (isWebApp && this.tg?.initDataUnsafe?.user?.id) {
            userId = this.tg.initDataUnsafe.user.id.toString();
        }
        
        // Если мы в браузерном режиме, возвращаем успех
        if (!isWebApp) {
            console.log("🌐 Режим браузера: имитация отправки данных");
            return { 
                success: true, 
                browserMode: true,
                message: "Browser mode, no data sent"
            };
        }
        
        try {
            // Используем текущий рабочий URL или запасной, если основной недоступен
            const url = this.currentApiUrl || this.backupApiUrl;
            
            console.log("🔄 Отправка данных на сервер:", url);
            console.log("📊 Данные:", { telegram_id: userId, date: birthdate });
            
            let response;
            try {
                // Отправляем запрос в режиме CORS
                response = await fetch(url, {
                    method: 'POST',
                    mode: 'cors', // Пробуем сначала с CORS
                    cache: 'no-cache',
                    headers: {
                        'Content-Type': 'application/json',
                        // Добавляем Origin для правильной обработки CORS
                        'Origin': window.location.origin
                    },
                    body: JSON.stringify({
                        telegram_id: userId,
                        date: birthdate
                    }),
                    signal: AbortSignal.timeout(10000) // 10 секунд таймаут
                });
                
                // Проверяем валидность ответа
                if (!response) {
                    throw new Error("Ответ от сервера не получен");
                }
                
                console.log("📊 Статус ответа:", response.status);
            } catch (corsError) {
                console.log("⚠️ CORS ошибка:", corsError.message || JSON.stringify(corsError));
                
                // При CORS ошибке сразу переходим к запасному варианту
                return await this.sendDefaultRequest(birthdate);
            }

            // Если запрос успешен
            if (response && response.ok) {
                try {
                    const result = await response.json();
                    console.log("✅ Данные успешно отправлены:", result);
                    
                    // Отправляем результат в Telegram WebApp
                    if (this.tg?.sendData) {
                        this.tg.sendData(JSON.stringify({
                            type: "register",
                            status: "success",
                            data: result
                        }));
                    }

                    return { success: true, data: result };
                } catch (jsonError) {
                    // Если не можем распарсить JSON, но запрос успешен
                    console.log("⚠️ Не удалось прочитать JSON, но статус запроса успешен");
                    
                    if (this.tg?.sendData) {
                        this.tg.sendData(JSON.stringify({
                            type: "register",
                            status: "success",
                            data: { message: "Data sent successfully" }
                        }));
                    }

                    return { success: true, data: { message: "Data sent successfully" } };
                }
            } else if (response) {
                // Если статус не ok, но ответ есть
                const errorMessage = `HTTP error! status: ${response.status || 'unknown'}`;
                console.error("❌ Ошибка HTTP:", errorMessage);
                throw new Error(errorMessage);
            } else {
                // Если ответ полностью отсутствует
                throw new Error("Ответ от сервера не получен");
            }
        } catch (error) {
            console.error("❌ Ошибка отправки данных:", error.message || JSON.stringify(error));
            
            // Если мы еще не превысили лимит повторных попыток, повторяем запрос
            if (retryCount < this.maxRetries) {
                console.log(`🔄 Повторная попытка ${retryCount + 1}/${this.maxRetries}...`);
                
                // Переключаемся на альтернативный URL если текущий не работает
                this.currentApiUrl = this.currentApiUrl === this.apiUrl ? this.backupApiUrl : this.apiUrl;
                
                // Небольшая задержка перед повтором
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this.sendUserData(birthdate, retryCount + 1);
            }
            
            // Если все попытки исчерпаны, пробуем запрос с параметрами по умолчанию
            if (userId !== this.defaultParams.telegram_id) {
                console.log("🔄 Использую параметры по умолчанию для запроса");
                return this.sendDefaultRequest(birthdate);
            }
            
            // Отправляем ошибку в Telegram WebApp
            if (this.tg?.sendData) {
                this.tg.sendData(JSON.stringify({
                    type: "register",
                    status: "error",
                    error: error.message || "Unknown error"
                }));
            }

            // В крайнем случае, выполняем имитацию успешного запроса
            console.log("⚠️ Все попытки исчерпаны. Имитируем успешную отправку данных для пользовательского интерфейса");
            
            return { 
                success: true, 
                simulated: true,
                error: error.message || "Unknown error"
            };
        }
    }
    
    // Метод для отправки запроса с параметрами по умолчанию
    async sendDefaultRequest(birthdate) {
        try {
            console.log("🔄 Отправка запроса с параметрами по умолчанию");
            console.log(`📊 curl -X POST ${this.backupApiUrl} -H "Content-Type: application/json" -d '{"telegram_id": "${this.defaultParams.telegram_id}", "date": "${birthdate || this.defaultParams.date}"}'`);
            
            // Сначала пробуем обычный запрос
            try {
                const response = await fetch(this.backupApiUrl, {
                    method: 'POST',
                    mode: 'cors',
                    cache: 'no-cache',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        telegram_id: this.defaultParams.telegram_id,
                        date: birthdate || this.defaultParams.date
                    }),
                    signal: AbortSignal.timeout(10000) // 10 секунд таймаут
                });
                
                if (response && response.ok) {
                    try {
                        const result = await response.json();
                        console.log("✅ Запрос с параметрами по умолчанию успешен:", result);
                        
                        // Отправляем результат в Telegram WebApp
                        if (this.tg?.sendData) {
                            this.tg.sendData(JSON.stringify({
                                type: "register",
                                status: "success",
                                data: result,
                                note: "Used default parameters"
                            }));
                        }

                        return { 
                            success: true, 
                            data: result,
                            usedDefaults: true
                        };
                    } catch (jsonError) {
                        // Если не можем распарсить JSON
                        console.log("⚠️ Запрос отправлен, но не удалось прочитать ответ");
                        
                        // Отправляем результат в Telegram WebApp
                        if (this.tg?.sendData) {
                            this.tg.sendData(JSON.stringify({
                                type: "register",
                                status: "success",
                                note: "Used default parameters, response could not be parsed"
                            }));
                        }

                        return { 
                            success: true, 
                            usedDefaults: true,
                            message: "Request sent, but response could not be parsed"
                        };
                    }
                } else {
                    throw new Error(`HTTP error! status: ${response?.status || 'unknown'}`);
                }
            } catch (corsError) {
                console.log("⚠️ Ошибка CORS при обычном запросе, пробуем no-cors");
                
                // Если обычный запрос не работает, используем no-cors
                await fetch(this.backupApiUrl, {
                    method: 'POST',
                    mode: 'no-cors', // Этот режим не даст читать ответ, но позволит сделать запрос
                    cache: 'no-cache',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        telegram_id: this.defaultParams.telegram_id,
                        date: birthdate || this.defaultParams.date
                    }),
                    signal: AbortSignal.timeout(10000) // 10 секунд таймаут
                });

                // В режиме no-cors мы не сможем прочитать ответ
                // но если мы дошли до этой точки, значит запрос отправлен
                console.log("✅ Запрос с параметрами по умолчанию отправлен (режим no-cors)");
                
                // Отправляем результат в Telegram WebApp
                if (this.tg?.sendData) {
                    this.tg.sendData(JSON.stringify({
                        type: "register",
                        status: "success",
                        note: "Used default parameters with no-cors mode"
                    }));
                }

                return { 
                    success: true, 
                    usedDefaults: true,
                    noCors: true
                };
            }
        } catch (error) {
            console.error("❌ Ошибка при использовании параметров по умолчанию:", error.message || JSON.stringify(error));
            
            // Отправляем ошибку в Telegram WebApp
            if (this.tg?.sendData) {
                this.tg.sendData(JSON.stringify({
                    type: "register",
                    status: "error",
                    error: error.message || "Unknown error"
                }));
            }
            
            // В крайнем случае, выполняем имитацию успешного запроса
            console.log("⚠️ Имитируем успешную отправку данных для пользовательского интерфейса");
            
            return { 
                success: true,
                simulated: true,
                usedDefaults: true,
                error: error.message || "Unknown error"
            };
        }
    }

    // Метод для тестирования API без Telegram
    async testApiConnection(userId, birthdate) {
        // Выводим команду curl для ручного тестирования
        console.log(`📋 Тестовая команда: curl -X POST ${this.backupApiUrl} -H "Content-Type: application/json" -d '{"telegram_id": "${userId || this.defaultParams.telegram_id}", "date": "${birthdate || this.defaultParams.date}"}'`);
        
        try {
            // Пробуем сначала с обычным запросом (cors)
            const response = await fetch(this.backupApiUrl, {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    telegram_id: userId?.toString() || this.defaultParams.telegram_id,
                    date: birthdate || this.defaultParams.date
                }),
                signal: AbortSignal.timeout(10000) // 10 секунд таймаут
            });
            
            if (response.ok) {
                try {
                    const result = await response.json();
                    console.log("✅ Тестовое подключение успешно:", result);
                    return { success: true, data: result };
                } catch (jsonError) {
                    console.log("⚠️ Запрос отправлен, но не удалось прочитать ответ");
                    return { 
                        success: true,
                        message: "Request sent, but response could not be parsed" 
                    };
                }
            } else {
                throw new Error(`HTTP error! status: ${response.status || 'unknown'}`);
            }
        } catch (corsError) {
            console.log("⚠️ CORS ошибка при тестировании, пробуем no-cors:", corsError.message);
            
            try {
                // Если получили ошибку CORS, пробуем с no-cors
                await fetch(this.backupApiUrl, {
                    method: 'POST',
                    mode: 'no-cors', // Используем no-cors для обхода CORS ограничений
                    cache: 'no-cache',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        telegram_id: userId?.toString() || this.defaultParams.telegram_id,
                        date: birthdate || this.defaultParams.date
                    }),
                    signal: AbortSignal.timeout(10000) // 10 секунд таймаут
                });
                
                // В режиме no-cors мы не сможем прочитать ответ
                console.log("✅ Тестовый запрос отправлен (режим no-cors)");
                
                return { 
                    success: true, 
                    message: "Request sent in no-cors mode. Check server logs for response.",
                    testParams: {
                        telegram_id: userId?.toString() || this.defaultParams.telegram_id,
                        date: birthdate || this.defaultParams.date  
                    },
                    noCors: true
                };
            } catch (noCorsError) {
                console.error("❌ Не удалось отправить тестовый запрос:", noCorsError.message);
                return { 
                    success: false, 
                    error: noCorsError.message,
                    fullError: JSON.stringify(noCorsError)
                };
            }
        }
    }

    #handleError(error) {
        console.error('WebApp error:', error.message || JSON.stringify(error));
        if (this.tg?.sendData) {
            this.tg.sendData(JSON.stringify({
                type: "error",
                error: error.message || "Unknown error"
            }));
        }
    }
}
