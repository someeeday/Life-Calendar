export class Calendar {
    constructor(selector) {
        // Move translations here
        this.translations = {
            age: '← Age',
            weeks: 'Weeks of Year →'
        };

        this.canvas = document.querySelector(selector);
        this.ctx = this.canvas?.getContext('2d', { alpha: false });
        this.theme = 'light';
        this.language = 'en';
        
        // Константы для отрисовки
        this.weeksPerYear = 52;
        this.totalYears = 91;
        this.isMobile = document.body.classList.contains('is-mobile');
        
        // Анимация последней недели
        this.animationFrame = null;
        this.lastWeekOpacity = 0.7; // Начальная прозрачность
        this.pulseDirection = -1; // -1 = затухание, 1 = усиление
        this.pulseSpeed = 0.003; // Скорость пульсации
        this.minOpacity = 0.3; // Минимальная прозрачность
        this.maxOpacity = 1.0; // Максимальная прозрачность

        // Вызываем setMobileMode после всех инициализаций
        this.setMobileMode(this.isMobile);
    }

    init() {
        if (!this.canvas) return;
        this.setupCanvas();
        this.draw();
        this.#setupResizeHandler();
    }

    setupCanvas() {
        const { width, height } = this.calculateDimensions();
        this.canvas.width = width;
        this.canvas.height = height;

        // Масштабирование для retina дисплеев
        const scale = window.devicePixelRatio;
        this.canvas.width *= scale;
        this.canvas.height *= scale;
        this.ctx.scale(scale, scale);
    }

    calculateDimensions() {
        const totalWidth = this.weeksPerYear * (this.cellSize + this.cellGap) + this.padding + (this.padding / 2);
        const totalHeight = this.totalYears * (this.cellSize + this.cellGap) + this.padding + (this.padding / 2);
        return { width: totalWidth, height: totalHeight };
    }

    draw(livedWeeks = 0) {
        if (!this.ctx) return;

        // Отменяем предыдущую анимацию
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        // Сохраняем livedWeeks в атрибут canvas для восстановления при ресайзе
        this.canvas.setAttribute('data-lived-weeks', livedWeeks);

        const colors = this.getThemeColors();
        const labels = this.getLabels();

        // Очистка canvas
        this.ctx.fillStyle = colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Отрисовка подписей
        this.drawLabels(labels, colors);
        
        // Отрисовка сетки
        this.drawGrid(livedWeeks, colors);
        
        // Запускаем анимацию последней недели, если есть прожитые недели
        if (livedWeeks > 0) {
            this.animateLastWeek(livedWeeks, colors);
        }
    }

    drawLabels(labels, colors) {
        this.ctx.font = `${this.fontSize}px Roboto`;
        this.ctx.fillStyle = colors.text;
        this.ctx.textBaseline = 'middle';
        this.ctx.textAlign = 'center';
        
        // Подписи для недель и возраста
        this.ctx.textAlign = 'left';
        this.ctx.fillText(labels.weeks, this.padding, this.padding - 45);
        
        // Отрисовка подписи "Возраст"
        this.ctx.save();
        this.ctx.translate(this.padding - 45, this.padding);
        this.ctx.rotate(-90 * Math.PI / 180);
        this.ctx.textAlign = 'right';
        this.ctx.fillText(labels.age, 0, 0);
        this.ctx.restore();

        // Отрисовка номеров недель
        this.ctx.textAlign = 'center';
        let weekNumbers = [1];
        for (let i = 5; i <= 50; i += 5) {
            weekNumbers.push(i);
        }

        weekNumbers.forEach((num, i) => {
            const x = this.padding + (i * 5) * (this.cellSize + this.cellGap) - this.cellSize / 2;
            if (i === 0) {
                this.ctx.fillText(num.toString(), 
                    x + (this.cellSize + this.cellGap + 15) / 2, 
                    this.padding - 20);
            } else {
                this.ctx.fillText(num.toString(), x - 2, this.padding - 20);
            }
        });

        // Отрисовка годов
        this.ctx.textAlign = 'right';
        for (let year = 0; year <= this.totalYears; year += 5) {
            const y = this.padding + year * (this.cellSize + this.cellGap) + this.cellSize / 2;
            this.ctx.fillText(year.toString(), this.padding - 20, y);
        }
    }

    drawGrid(livedWeeks, colors) {
        this.ctx.strokeStyle = colors.grid;
        this.ctx.lineWidth = 0.5;
        
        const totalWeeks = this.totalYears * this.weeksPerYear;
        
        for (let week = 0; week < totalWeeks; week++) {
            const col = week % this.weeksPerYear;
            const row = Math.floor(week / this.weeksPerYear);
            
            const x = this.padding + col * (this.cellSize + this.cellGap);
            const y = this.padding + row * (this.cellSize + this.cellGap);
            
            // Определяем, это обычная синяя клетка или последняя прожитая неделя
            const isLastLivedWeek = (week === livedWeeks - 1);
            const isFilled = week < livedWeeks;
            
            this.ctx.fillStyle = isFilled ? colors.lived : colors.future;
            this.ctx.beginPath();
            this.ctx.roundRect(x, y, this.cellSize, this.cellSize, this.cellSize * 0.15);
            this.ctx.fill();
            
            // Добавляем обводку только для незаполненных (серых) клеток
            if (!isFilled) {
                this.ctx.stroke();
            }
        }
    }

    // Новый метод для анимации последней недели
    animateLastWeek(livedWeeks, colors) {
        // Получаем координаты последней недели
        const col = (livedWeeks - 1) % this.weeksPerYear;
        const row = Math.floor((livedWeeks - 1) / this.weeksPerYear);
        const x = this.padding + col * (this.cellSize + this.cellGap);
        const y = this.padding + row * (this.cellSize + this.cellGap);
        
        const animate = () => {
            // Изменяем прозрачность в зависимости от направления
            this.lastWeekOpacity += this.pulseDirection * this.pulseSpeed;
            
            // Меняем направление при достижении пределов
            if (this.lastWeekOpacity <= this.minOpacity) {
                this.lastWeekOpacity = this.minOpacity;
                this.pulseDirection = 1; // Начинаем усиление
            } else if (this.lastWeekOpacity >= this.maxOpacity) {
                this.lastWeekOpacity = this.maxOpacity;
                this.pulseDirection = -1; // Начинаем затухание
            }
            
            // Очищаем только область последней клетки для оптимизации
            this.ctx.fillStyle = this.getThemeColors().background;
            this.ctx.fillRect(x - 1, y - 1, this.cellSize + 2, this.cellSize + 2);
            
            // Рисуем последнюю неделю с текущей прозрачностью
            this.ctx.save();
            this.ctx.globalAlpha = this.lastWeekOpacity;
            this.ctx.fillStyle = colors.lived;
            this.ctx.beginPath();
            this.ctx.roundRect(x, y, this.cellSize, this.cellSize, this.cellSize * 0.15);
            this.ctx.fill();
            this.ctx.restore();
            
            // Продолжаем анимацию
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        // Запускаем анимацию
        this.animationFrame = requestAnimationFrame(animate);
    }

    setLanguage(lang) {
        this.language = lang;
        
        // Перерисовываем с сохранением текущего состояния календаря
        const livedWeeks = parseInt(this.canvas?.getAttribute('data-lived-weeks') || '0');
        this.draw(livedWeeks);
    }

    #setupResizeHandler() {
        let resizeTimeout;

        window.addEventListener('resize', () => {
            // Отменяем анимацию при начале ресайза
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }
            
            clearTimeout(resizeTimeout);
            
            // Сохраняем текущие livedWeeks перед ресайзом
            const livedWeeks = parseInt(this.canvas?.getAttribute('data-lived-weeks') || '0');

            resizeTimeout = setTimeout(() => {
                this.setupCanvas();
                // Перерисовываем с сохраненными livedWeeks
                this.draw(livedWeeks);
            }, 100);
        });
    }

    /**
     * Метод для добавления маркера события на определенную неделю
     * @param {Object} event - Информация о событии
     * @param {number} event.week - Номер недели
     * @param {string} event.color - Цвет события (hex)
     * @param {string} event.title - Название события
     */
    addEventMarker(event) {
        if (!event || !event.week) return;
        
        const col = event.week % this.weeksPerYear;
        const row = Math.floor(event.week / this.weeksPerYear);
        const x = this.padding + col * (this.cellSize + this.cellGap);
        const y = this.padding + row * (this.cellSize + this.cellGap);
        
        // Рисуем маркер события (маленький цветной кружок в углу клетки)
        this.ctx.save();
        this.ctx.fillStyle = event.color || '#FF5722';
        this.ctx.beginPath();
        this.ctx.arc(
            x + this.cellSize - 3, 
            y + 3, 
            2, 
            0, 
            Math.PI * 2
        );
        this.ctx.fill();
        this.ctx.restore();
    }
    
    /**
     * Рисует линии через определённые промежутки лет для визуального разделения
     * (например, каждые 10 лет)
     */
    drawDecadeLines(colors) {
        const decadeYears = 10; // Периодичность линий
        this.ctx.save();
        this.ctx.strokeStyle = colors.grid;
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([4, 4]); // Пунктирная линия
        
        for (let year = decadeYears; year < this.totalYears; year += decadeYears) {
            const y = this.padding + year * (this.cellSize + this.cellGap);
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.padding - 10, y - this.cellGap/2);
            this.ctx.lineTo(this.padding + this.weeksPerYear * (this.cellSize + this.cellGap), y - this.cellGap/2);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    /**
     * Добавляет подсветку для текущего возраста (строки)
     */
    highlightCurrentAge(livedWeeks, colors) {
        if (!livedWeeks) return;
        
        const currentYear = Math.floor(livedWeeks / this.weeksPerYear);
        const y = this.padding + currentYear * (this.cellSize + this.cellGap);
        
        // Подсвечиваем текущий год
        this.ctx.save();
        this.ctx.fillStyle = colors.text;
        this.ctx.globalAlpha = 0.05;
        this.ctx.fillRect(
            this.padding - 10, 
            y - this.cellGap, 
            this.weeksPerYear * (this.cellSize + this.cellGap) + 15, 
            this.cellSize + this.cellGap * 2
        );
        this.ctx.restore();
        
        // Выделяем год в подписи
        this.ctx.save();
        this.ctx.font = `bold ${this.fontSize}px Roboto`;
        this.ctx.fillStyle = colors.text;
        this.ctx.textAlign = 'right';
        this.ctx.fillText(
            currentYear.toString(), 
            this.padding - 20, 
            y + this.cellSize / 2
        );
        this.ctx.restore();
    }

    setMobileMode(isMobile) {
        this.cellSize = isMobile ? 12 : 15;
        this.padding = isMobile ? 60 : 80;
        this.fontSize = isMobile ? 11 : 12;
        this.cellGap = isMobile ? 1 : 2;
        
        // Перерисовываем если уже есть данные
        if (this.canvas) {
            const livedWeeks = this.canvas.getAttribute('data-lived-weeks');
            this.setupCanvas();
            this.draw(parseInt(livedWeeks) || 0);
        }
    }

    getThemeColors() {
        const rootStyles = getComputedStyle(document.documentElement);
        return {
            background: rootStyles.getPropertyValue(`--background-${this.theme}`).trim(),
            text: rootStyles.getPropertyValue(`--text-${this.theme}`).trim(),
            grid: rootStyles.getPropertyValue(`--grid-${this.theme}`).trim(),
            lived: rootStyles.getPropertyValue(`--lived-${this.theme}`).trim(),
            future: rootStyles.getPropertyValue(`--future-${this.theme}`).trim()
        };
    }

    getLabels() {
        return this.translations;
    }
}
