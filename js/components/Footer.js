import { translations } from '../config/translations.js';

export class Footer {
    constructor(selector) {
        this.footer = document.querySelector(selector);
        this.isHidden = true;
    }

    init() {
        if (!this.footer) return;
        
        this.footer.innerHTML = '';
        this.render();
        this.setupEventListeners();
    }

    render() {
        // Создаем структуру футера оптимизированным способом
        const html = `
            <div class="footer__content">
                <span class="footer__text">Created by</span>
                <span id="author-link" class="clickable-link" role="button" tabindex="0">@someeeday</span>
            </div>
            <div id="hidden-content" class="hidden-content" style="display:none;"></div>
        `;
        
        this.footer.insertAdjacentHTML('beforeend', html);
        
        // Кэшируем ссылки на элементы
        this.authorLink = document.getElementById('author-link');
        this.hiddenContent = document.getElementById('hidden-content');
        
        // Инициализируем содержимое скрытого блока
        this.updateHiddenContent();
    }

    setupEventListeners() {
        // Используем делегирование событий
        this.footer.addEventListener('click', e => {
            if (e.target.id === 'author-link' || e.target.closest('#author-link')) {
                this.toggleHiddenContent();
                e.preventDefault();
            }
        });
        
        // Обработчик для клика вне футера
        document.addEventListener('click', e => {
            if (this.hiddenContent?.style.display === 'block' && 
                !this.footer.contains(e.target)) {
                this.hideHiddenContent();
            }
        });
        
        // Слушаем изменение языка через один обработчик
        const languageChangeHandler = e => {
            this.hideHiddenContent();
            this.updateHiddenContent(e.detail);
        };
        
        document.addEventListener('languageChanged', languageChangeHandler);
        window.addEventListener('languageChanged', languageChangeHandler);
    }

    toggleHiddenContent() {
        if (this.isHidden) {
            this.showHiddenContent();
        } else {
            this.hideHiddenContent();
        }
    }

    showHiddenContent() {
        if (!this.hiddenContent) return;
        
        this.hiddenContent.style.display = 'block';
        this.isHidden = false;
        
        this.updateHiddenContent();
        
        // Используем requestAnimationFrame для более плавной прокрутки
        requestAnimationFrame(() => {
            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: 'smooth'
            });
        });
    }

    hideHiddenContent() {
        if (this.hiddenContent) {
            this.hiddenContent.style.display = 'none';
            this.isHidden = true;
        }
    }

    updateContent(lang) {
        this.updateHiddenContent(lang);
    }

    updateHiddenContent(lang) {
        if (!this.hiddenContent) return;
        
        const currentLang = lang || document.documentElement.lang || 'ru';
        const isTelegram = window.app?.telegram?.isTelegramWebApp?.() || false;
        
        // Создаем контент сразу с правильным переводом
        const contactText = translations[currentLang]?.contactText || 
                          (currentLang === 'ru' 
                            ? 'Если у вас есть вопросы или предложения, напишите мне:' 
                            : 'If you have any questions or suggestions, message me:');
        
        const html = `
            <p class="hidden-content__text">
                ${contactText} 
                <a href="https://t.me/someeeday" target="_blank" class="footer__link">
                    t.me/someeeday
                </a>
            </p>
        `;
        
        this.hiddenContent.innerHTML = html;
    }

    toggleVisibility(show) {
        if (this.footer) {
            this.footer.style.display = show ? 'block' : 'none';
        }
    }
}
