// ============ УНИВЕРСАЛЬНЫЙ СЛАЙДЕР ============
class Slider {
    constructor(containerId) {
        this.currentIndex = 0;
        this.images = document.querySelectorAll('.slide');
        this.sliderImages = document.getElementById('sliderImages');
        this.dotsContainer = document.getElementById('sliderDots');
        this.autoInterval = null;
        
        if (this.images.length > 0) {
            this.init();
        }
    }
    
    init() {
        // Создаём точки (индикаторы)
        for (let i = 0; i < this.images.length; i++) {
            const dot = document.createElement('div');
            dot.classList.add('dot');
            dot.onclick = () => this.goToSlide(i);
            this.dotsContainer.appendChild(dot);
        }
        
        this.updateDots();
        this.startAutoSlide();
        
        // Кнопки управления
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        if (prevBtn) prevBtn.onclick = () => this.prevSlide();
        if (nextBtn) nextBtn.onclick = () => this.nextSlide();
    }
    
    updateSlider() {
        if (this.sliderImages) {
            this.sliderImages.style.transform = `translateX(-${this.currentIndex * 100}%)`;
        }
        this.updateDots();
    }
    
    updateDots() {
        const dots = document.querySelectorAll('.dot');
        dots.forEach((dot, i) => {
            if (i === this.currentIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
    
    nextSlide() {
        this.currentIndex = (this.currentIndex + 1) % this.images.length;
        this.updateSlider();
        this.resetAutoSlide();
    }
    
    prevSlide() {
        this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
        this.updateSlider();
        this.resetAutoSlide();
    }
    
    goToSlide(index) {
        this.currentIndex = index;
        this.updateSlider();
        this.resetAutoSlide();
    }
    
    startAutoSlide() {
        this.autoInterval = setInterval(() => {
            this.nextSlide();
        }, 3000);  // 3 секунды
    }
    
    resetAutoSlide() {
        clearInterval(this.autoInterval);
        this.startAutoSlide();
    }
}

// Запускаем при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new Slider();
});
