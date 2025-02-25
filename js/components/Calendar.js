import { themes } from '../config/themes.js';
import { translations } from '../config/translations.js';

export class Calendar {
    constructor(selector) {
        this.canvas = document.querySelector(selector);
        this.ctx = this.canvas?.getContext('2d');
        this.theme = 'light';
        this.language = 'ru';
        
        // Константы для отрисовки
        this.weeksPerYear = 52;
        this.totalYears = 91;
        this.isMobile = document.body.classList.contains('is-mobile');
        this.cellSize = this.isMobile ? 12 : 15;
        this.padding = this.isMobile ? 60 : 80;
        this.fontSize = this.isMobile ? 11 : 12;
        this.cellGap = this.isMobile ? 1 : 2;
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
        const totalWidth = this.weeksPerYear * (this.cellSize + this.cellGap) + this.padding * 2;
        const totalHeight = this.totalYears * (this.cellSize + this.cellGap) + this.padding * 2;
        return { width: totalWidth, height: totalHeight };
    }

    draw(livedWeeks = 0) {
        if (!this.ctx) return;

        // Сохраняем livedWeeks в атрибут canvas для восстановления при ресайзе
        this.canvas.setAttribute('data-lived-weeks', livedWeeks);

        const colors = themes[this.theme];
        const labels = translations[this.language];

        // Очистка canvas
        this.ctx.fillStyle = colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Отрисовка подписей
        this.drawLabels(labels, colors);
        
        // Отрисовка сетки
        this.drawGrid(livedWeeks, colors);
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
            
            this.ctx.fillStyle = week < livedWeeks ? colors.lived : colors.future;
            this.ctx.beginPath();
            this.ctx.roundRect(x, y, this.cellSize, this.cellSize, this.cellSize * 0.15);
            this.ctx.fill();
            this.ctx.stroke();
        }
    }

    updateTheme(theme) {
        this.theme = theme;
        this.draw();
    }

    setLanguage(lang) {
        this.language = lang;
        this.draw();
    }

    #setupResizeHandler() {
        let resizeTimeout;
        let lastLivedWeeks;

        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            
            // Сохраняем текущие livedWeeks перед ресайзом
            const canvas = document.querySelector('#lifeCanvas');
            if (canvas) {
                lastLivedWeeks = canvas.getAttribute('data-lived-weeks') || 0;
            }

            resizeTimeout = setTimeout(() => {
                this.setupCanvas();
                // Перерисовываем с сохраненными livedWeeks
                this.draw(parseInt(lastLivedWeeks));
            }, 100);
        });
    }
}
