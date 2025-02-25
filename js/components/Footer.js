import { translations } from '../config/translations.js';
import { StorageService } from '../services/StorageService.js';

export class Footer {
    constructor(selector) {
        this.footer = document.querySelector(selector);
        this.hiddenContent = document.querySelector('#hidden-content');
        this.hiddenText = document.querySelector('#hidden-text');
        this.storage = new StorageService();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.querySelector('.clickable-link')?.addEventListener('click', 
            () => this.toggleHiddenContent());
    }

    toggleHiddenContent() {
        try {
            if (this.hiddenContent && this.hiddenText) {
                const isHidden = this.hiddenContent.style.display === 'none';
                this.hiddenContent.style.display = isHidden ? 'block' : 'none';
                
                const settings = this.storage.loadSettings();
                this.hiddenText.innerHTML = translations[settings.language].hiddenText;
                
                if (isHidden) {
                    this.hiddenContent.scrollIntoView({ behavior: 'smooth' });
                }
            }
        } catch (error) {
            console.error('Ошибка переключения скрытого контента:', error);
        }
    }
}
