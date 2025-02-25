import { translations } from '../config/translations.js';
import { StorageService } from '../services/StorageService.js';

export class Footer {
    constructor(selector) {
        this.footer = document.querySelector(selector);
        this.hiddenContent = document.getElementById('hidden-content');
        this.hiddenText = document.getElementById('hidden-text');
        this.authorLink = document.querySelector('.clickable-link');
        this.isHidden = true;
        this.storage = new StorageService();
    }

    init() {
        if (!this.footer || !this.hiddenContent || !this.hiddenText || !this.authorLink) {
            return;
        }

        // Начальное состояние
        this.hiddenContent.style.display = 'none';
        
        // Больше не добавляем обработчик здесь, так как он добавляется в App.js
    }

    updateContent(lang) {
        if (!this.hiddenContent || !this.hiddenText) return;
        
        const settings = this.storage.loadSettings();
        this.hiddenText.innerHTML = translations[lang || settings.language].hiddenText;
    }

    handleLinkClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        this.isHidden = !this.isHidden;
        
        // Получаем настройки
        const settings = this.storage.loadSettings();
        const currentLang = settings.language || 'ru';

        // Обновляем состояние контента
        this.hiddenContent.style.display = this.isHidden ? 'none' : 'block';
        
        // Обновляем текст только при показе
        if (!this.isHidden) {
            this.updateContent(currentLang);
            setTimeout(() => {
                this.hiddenContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }
}
