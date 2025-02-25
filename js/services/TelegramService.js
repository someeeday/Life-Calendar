export class TelegramService {
    constructor() {
        this.tg = window.Telegram?.WebApp;
        this.apiUrl = 'http://217.144.186.159:8080/webhook';
        this.callbacks = new Map();
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
    }

    isTelegramWebApp() {
        return Boolean(
            this.tg?.initDataUnsafe?.user?.id &&
            this.tg?.initData &&
            this.tg?.platform !== 'unknown' &&
            this.tg?.version
        );
    }

    async sendUserData(birthdate) {
        if (!this.isTelegramWebApp()) {
            // В браузере просто возвращаем успешный результат без сообщений об ошибке
            return {
                success: true,
                browserMode: true,
                data: { birthdate }
            };
        }

        try {
            const userId = this.tg.initDataUnsafe.user.id;
            console.log("📤 Подготовка данных для отправки:", { userId, birthdate });

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
            console.log("✅ Данные успешно отправлены:", result);

            // Отправляем успешный статус в Telegram WebApp
            this.tg.sendData(JSON.stringify({
                type: "register",
                status: "success",
                date: birthdate
            }));

            // Закрываем WebApp после успешной отправки
            setTimeout(() => this.tg.close(), 100);

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
