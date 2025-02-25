import { translations } from '../config/translations.js';
import { StorageService } from '../services/StorageService.js';

export class DatePicker {
    #monthSelect;
    #yearSelect;
    #datesContainer;
    #currentDate;

    constructor(selector) {
        this.input = document.querySelector(selector);
        this.calendarIcon = document.querySelector('#calendar-icon');
        this.calendar = document.querySelector('#custom-calendar');
        this.errorElement = document.querySelector('#birthdate-error');
        this.storage = new StorageService();
        
        this.#currentDate = new Date();
        this.minYear = 1900;
        this.maxYear = this.#currentDate.getFullYear();
    }

    init() {
        try {
            this.setupEventListeners();
            this.buildCalendar();
            this.restoreLastValue();
        } catch (error) {
            console.error('Ошибка инициализации DatePicker:', error);
        }
    }

    setupEventListeners() {
        // Input events
        this.input?.addEventListener('input', this.handleInput.bind(this));
        this.input?.addEventListener('blur', this.validateDate.bind(this));
        this.input?.addEventListener('keypress', this.handleKeyPress.bind(this));

        // Calendar events
        this.calendarIcon?.addEventListener('click', this.toggleCalendar.bind(this));
        document.addEventListener('click', this.handleOutsideClick.bind(this));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeCalendar();
        });
    }

    handleInput(e) {
        try {
            this.hideError();
            let value = e.target.value.replace(/\D/g, '');
            e.target.value = this.formatDate(value);
            this.storage.setSetting('tempDate', e.target.value);
        } catch (error) {
            console.error('Ошибка ввода даты:', error);
        }
    }

    formatDate(value) {
        let formatted = '';
        if (value.length > 0) formatted += value.slice(0, 2);
        if (value.length > 2) {
            const month = value.slice(2, 4);
            formatted += '.' + (month.length === 1 && month >= '2' && month <= '9' 
                ? '0' + month 
                : month);
        }
        if (value.length > 4) formatted += '.' + value.slice(4, 8);
        return formatted;
    }

    validateDate() {
        const value = this.input.value;
        if (!value) return true;

        if (!this.isValidDate(value)) {
            this.showError(translations[document.documentElement.lang].invalidDate);
            return false;
        }

        this.hideError();
        return true;
    }

    handleKeyPress(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (this.validateDate()) {
                this.closeCalendar();
            }
        }
    }

    toggleCalendar() {
        if (!this.calendar) return;
        
        if (this.calendar.classList.contains('open')) {
            this.closeCalendar();
        } else {
            this.openCalendar();
            // Скрываем ошибку при открытии календаря
            this.hideError();
        }
    }

    openCalendar() {
        if (this.calendar.classList.contains('open')) return;
        
        this.calendar.classList.add('open');
        if (this.input.value && this.isValidDate(this.input.value)) {
            const [day, month, year] = this.input.value.split('.');
            this.#monthSelect.value = parseInt(month) - 1;
            this.#yearSelect.value = year;
            this.updateCalendarDates();
            this.highlightSelectedDate(this.input.value);
        }
    }

    closeCalendar() {
        this.calendar?.classList.remove('open');
    }

    handleOutsideClick(event) {
        if (!this.calendar?.contains(event.target) && 
            !this.calendarIcon?.contains(event.target)) {
            this.calendar?.classList.remove('open');
        }
    }

    showError(message) {
        if (this.errorElement) {
            this.errorElement.textContent = message;
            this.errorElement.style.display = 'block';
        }
    }

    hideError() {
        if (this.errorElement) {
            this.errorElement.style.display = 'none';
        }
    }

    buildCalendar() {
        if (!this.calendar) return;

        const lang = document.documentElement.lang || 'ru';
        const currentDate = new Date();
        
        // Устанавливаем текущий месяц и год, если дата не выбрана
        const [currentDay, currentMonth, currentYear] = this.input.value 
            ? this.input.value.split('.').map(Number)
            : [currentDate.getDate(), currentDate.getMonth() + 1, currentDate.getFullYear()];

        let calendarHtml = '<div class="calendar-header">';
        calendarHtml += '<select id="calendar-month">';
        translations[lang].months.forEach((month, i) => {
            const selected = i === (currentMonth - 1) ? 'selected' : '';
            calendarHtml += `<option value="${i}" ${selected}>${month}</option>`;
        });
        calendarHtml += '</select>';

        calendarHtml += '<select id="calendar-year">';
        for (let i = currentDate.getFullYear() - 100; i <= currentDate.getFullYear(); i++) {
            const selected = i === currentYear ? 'selected' : '';
            calendarHtml += `<option value="${i}" ${selected}>${i}</option>`;
        }
        calendarHtml += '</select></div>';

        calendarHtml += '<div class="calendar-days">';
        translations[lang].weekDays.forEach(day => {
            calendarHtml += `<div class="day-name">${day}</div>`;
        });
        calendarHtml += '</div>';

        calendarHtml += '<div class="calendar-dates"></div>';

        this.calendar.innerHTML = calendarHtml;

        this.#monthSelect = document.getElementById('calendar-month');
        this.#yearSelect = document.getElementById('calendar-year');
        this.#datesContainer = this.calendar.querySelector('.calendar-dates');

        this.#setCalendarListeners();

        this.updateCalendarDates();
    }

    updateCalendarDates() {
        if (!this.calendar) return;

        const month = parseInt(this.#monthSelect?.value || '0', 10);
        const year = parseInt(this.#yearSelect?.value || new Date().getFullYear().toString(), 10);

        // Добавляем проверку на валидный месяц и год
        if (isNaN(month) || isNaN(year)) return;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const adjustedFirstDay = (firstDay === 0) ? 6 : firstDay - 1;

        const datesContainer = this.#datesContainer;
        if (!datesContainer) return;

        let datesHtml = '';
        
        // Пустые ячейки до первого дня месяца
        for (let i = 0; i < adjustedFirstDay; i++) {
            datesHtml += '<div class="calendar-date empty"></div>';
        }

        // Дни месяца
        for (let i = 1; i <= daysInMonth; i++) {
            const date = `${String(i).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${year}`;
            datesHtml += `<div class="calendar-date" data-date="${date}">${i}</div>`;
        }

        datesContainer.innerHTML = datesHtml;

        // Добавляем обработчики для дат
        this.calendar.querySelectorAll('.calendar-date:not(.empty)').forEach(dateElement => {
            dateElement.addEventListener('click', () => {
                const selectedDate = dateElement.getAttribute('data-date');
                if (selectedDate) {
                    this.input.value = selectedDate;
                    this.highlightSelectedDate(selectedDate);
                    this.closeCalendar();
                    // Генерируем событие изменения для обновления календаря жизни
                    const event = new Event('change');
                    this.input.dispatchEvent(event);
                }
            });
        });

        // Подсвечиваем текущую выбранную дату
        if (this.input.value) {
            this.highlightSelectedDate(this.input.value);
        }
    }

    highlightSelectedDate(date) {
        if (!this.calendar) return;
        
        this.calendar.querySelectorAll('.calendar-date').forEach(dateElement => {
            if (dateElement.getAttribute('data-date') === date) {
                dateElement.classList.add('highlight');
            } else {
                dateElement.classList.remove('highlight');
            }
        });
    }

    syncCalendarWithInput() {
        const month = this.#monthSelect?.value;
        const year = this.#yearSelect?.value;
        
        if (!month || !year || !this.input.value) return;
        
        const [day] = this.input.value.split('.');
        const newDate = `${day}.${String(parseInt(month) + 1).padStart(2, '0')}.${year}`;
        
        this.updateCalendarDates();
        this.highlightSelectedDate(newDate);
    }

    isValidDate(dateString) {
        const parts = dateString.split('.');
        if (parts.length !== 3) return false;
        
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        
        if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
        if (month < 1 || month > 12) return false;
        if (year < 1900 || year > new Date().getFullYear()) return false;
        
        const daysInMonth = new Date(year, month, 0).getDate();
        return day > 0 && day <= daysInMonth;
    }

    #setCalendarListeners() {
        // Обработчики изменения месяца и года
        this.#monthSelect?.addEventListener('change', () => {
            this.updateCalendarDates();
            const selectedDate = this.getSelectedDateFromCalendar();
            if (selectedDate) {
                this.input.value = selectedDate;
                this.emitChangeEvent();
            }
        });

        this.#yearSelect?.addEventListener('change', () => {
            this.updateCalendarDates();
            const selectedDate = this.getSelectedDateFromCalendar();
            if (selectedDate) {
                this.input.value = selectedDate;
                this.emitChangeEvent();
            }
        });
    }

    // Новый метод для получения выбранной даты из текущих значений селектов
    getSelectedDateFromCalendar() {
        const month = parseInt(this.#monthSelect?.value || '0', 10);
        const year = parseInt(this.#yearSelect?.value || new Date().getFullYear().toString(), 10);
        const day = this.input.value ? parseInt(this.input.value.split('.')[0], 10) : 1;

        // Проверяем валидность дня для выбранного месяца и года
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const validDay = Math.min(day, daysInMonth);

        return `${String(validDay).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${year}`;
    }

    emitChangeEvent() {
        const event = new CustomEvent('datechange', {
            detail: { date: this.input.value }
        });
        this.input.dispatchEvent(event);
    }

    restoreLastValue() {
        const lastDate = this.storage.getSetting('tempDate');
        if (lastDate && this.isValidDate(lastDate)) {
            this.input.value = lastDate;
            this.highlightSelectedDate(lastDate);
        }
    }
}
