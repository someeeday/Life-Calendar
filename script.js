function calculateWeeksLived(birthdate) {
    const birthDate = new Date(birthdate);
    const currentDate = new Date();
    const livedDays = Math.floor((currentDate - birthDate) / (1000 * 60 * 60 * 24));
    const livedWeeks = Math.floor(livedDays / 7);
    return livedWeeks;
}

function createLifeGrid(livedWeeks, totalYears = 90) {
    const weeksPerYear = 52;
    const totalWeeks = totalYears * weeksPerYear;
    const canvas = document.getElementById('lifeCanvas');
    const ctx = canvas.getContext('2d');
    const cellSize = 10;

    canvas.width = totalYears * cellSize;
    canvas.height = weeksPerYear * cellSize;

    for (let week = 0; week < totalWeeks; week++) {
        const x = Math.floor(week / weeksPerYear) * cellSize;
        const y = (week % weeksPerYear) * cellSize;
        const color = week < livedWeeks ? 'blue' : 'gray';
        ctx.fillStyle = color;
        ctx.fillRect(x, y, cellSize - 1, cellSize - 1);
    }
}

function generateLifeCalendar() {
    const birthdate = document.getElementById('birthdate').value;
    if (!birthdate) {
        alert('Пожалуйста, введите вашу дату рождения.');
        return;
    }
    const livedWeeks = calculateWeeksLived(birthdate);
    createLifeGrid(livedWeeks);
}

function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'dark') {
        root.style.setProperty('--background-color', '#1c1c1c');
        root.style.setProperty('--text-color', '#ffffff');
        root.style.setProperty('--container-background-color', '#2c2c2c');
        root.style.setProperty('--container-text-color', '#ffffff');
        root.style.setProperty('--button-background-color', '#0088cc');
        root.style.setProperty('--button-text-color', '#ffffff');
        root.style.setProperty('--canvas-border-color', '#444');
    } else {
        root.style.setProperty('--background-color', '#ffffff');
        root.style.setProperty('--text-color', '#000000');
        root.style.setProperty('--container-background-color', '#ffffff');
        root.style.setProperty('--container-text-color', '#000000');
        root.style.setProperty('--button-background-color', '#0088cc');
        root.style.setProperty('--button-text-color', '#ffffff');
        root.style.setProperty('--canvas-border-color', '#ccc');
    }
}

// Определение темы при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    const theme = window.Telegram.WebApp.themeParams.theme;
    applyTheme(theme);

    // Установка даты рождения, если она доступна
    const birthdate = window.Telegram.WebApp.initDataUnsafe.user?.birthdate;
    if (birthdate) {
        document.getElementById('birthdate').value = birthdate;
    }

    // Установка приложения во весь экран
    window.Telegram.WebApp.expand();
}); 