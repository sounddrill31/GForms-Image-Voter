class ImageGallery {
  constructor() {
    this.images = [];
    this.currentSlide = 0;
    this.autoPlayInterval = null;
    this.initializeElements();
    this.init();
  }

  async init() {
    this.showLoading();
    try {
      const res = await fetch('teams.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Convert JSON to internal list
      this.images = data.map(team => ({
        src: team.image,
        filename: team.image.split('/').pop(),
        folder: team.image.split('/').slice(-2, -1)[0] || '',
        teamName: team.teamName,
        description: team.description || ''
      }));

      if (this.images.length === 0) {
        this.showError("No teams found in teams.json");
        return;
      }

      this.hideLoading();
      this.renderCarousel();
      this.showCarousel(); // Make sure carousel is visible
      this.startAutoPlay();
    } catch (err) {
      console.error("Failed to load teams.json", err);
      this.hideLoading();
      this.showError("Error loading team data");
    }
  }

  initializeElements() {
    this.carousel = document.getElementById('carousel');
    this.carouselContainer = document.getElementById('carouselContainer');
    this.dotsContainer = document.getElementById('carouselDots');
    this.loadingState = document.getElementById('loadingState');
    this.errorState = document.getElementById('errorState');
    this.prevBtn = document.getElementById('prevBtn');
    this.nextBtn = document.getElementById('nextBtn');

    // Modal
    this.imageModal = document.getElementById('imageModal');
    this.modalImage = document.getElementById('modalImage');
    this.modalFilename = document.getElementById('modalFilename');
    this.previewLoading = document.getElementById('previewLoading');
    this.closeModal = document.getElementById('closeModal');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.copyBtn = document.getElementById('copyBtn');

    // Voting modal
    this.votingModal = document.getElementById('votingModal');
    this.votingBtn = document.getElementById('votingBtn');
    this.closeVoting = document.getElementById('closeVoting');

    // Event listeners
    this.prevBtn.addEventListener('click', () => this.previousSlide());
    this.nextBtn.addEventListener('click', () => this.nextSlide());
    this.carouselContainer.addEventListener('mouseenter', () => this.pauseAutoPlay());
    this.carouselContainer.addEventListener('mouseleave', () => this.startAutoPlay());
    document.addEventListener('keydown', (e) => this.keyHandler(e));

    // Modal controls
    this.closeModal.addEventListener('click', () => this.closeImagePreview());
    this.imageModal.addEventListener('click', (e) => {
      if (e.target === this.imageModal) this.closeImagePreview();
    });

    // Image actions
    this.downloadBtn.addEventListener('click', () => this.downloadImage());
    this.copyBtn.addEventListener('click', () => this.copyImage());

    // Voting form
    this.votingBtn.addEventListener('click', () => this.openVotingForm());
    this.closeVoting.addEventListener('click', () => this.closeVotingForm());
    this.votingModal.addEventListener('click', (e) => {
      if (e.target === this.votingModal) this.closeVotingForm();
    });
  }

  keyHandler(e) {
    if (this.imageModal.classList.contains('active') || this.votingModal.classList.contains('active')) {
      if (e.key === 'Escape') {
        this.closeImagePreview();
        this.closeVotingForm();
      }
      return;
    }
    if (e.key === 'ArrowLeft') this.previousSlide();
    if (e.key === 'ArrowRight') this.nextSlide();
  }

  renderCarousel() {
    this.carousel.innerHTML = '';
    this.dotsContainer.innerHTML = '';

    this.images.forEach((img, idx) => {
      // Create slide
      const slide = document.createElement('div');
      slide.className = 'carousel-slide';
      slide.dataset.index = idx;

      const imageEl = document.createElement('img');
      imageEl.src = img.src;
      imageEl.alt = img.teamName || img.filename;
      imageEl.addEventListener('click', () => this.openImagePreview(idx));

      const label = document.createElement('div');
      label.className = 'slide-label';
      label.textContent = img.teamName || `${img.folder}/${img.filename}`;

      slide.appendChild(imageEl);
      slide.appendChild(label);
      this.carousel.appendChild(slide);

      // Create dot
      const dot = document.createElement('div');
      dot.className = 'dot';
      dot.addEventListener('click', () => this.goToSlide(idx));
      this.dotsContainer.appendChild(dot);
    });

    this.updateCarousel();
  }

  updateCarousel() {
    const slides = this.carousel.querySelectorAll('.carousel-slide');
    const dots = this.dotsContainer.querySelectorAll('.dot');
    
    slides.forEach((slide, idx) => {
      slide.className = 'carousel-slide';
      
      if (idx === this.currentSlide) {
        slide.classList.add('active');
      } else if (idx === this.getPrevIndex()) {
        slide.classList.add('prev');
      } else if (idx === this.getNextIndex()) {
        slide.classList.add('next');
      } else {
        slide.classList.add('hidden');
      }
    });

    // Update dots
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === this.currentSlide);
    });
  }

  getPrevIndex() {
    return (this.currentSlide - 1 + this.images.length) % this.images.length;
  }

  getNextIndex() {
    return (this.currentSlide + 1) % this.images.length;
  }

  goToSlide(i) {
    this.currentSlide = i;
    this.updateCarousel();
    this.resetAutoPlay();
  }

  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.images.length;
    this.updateCarousel();
    this.resetAutoPlay();
  }

  previousSlide() {
    this.currentSlide = (this.currentSlide - 1 + this.images.length) % this.images.length;
    this.updateCarousel();
    this.resetAutoPlay();
  }

  startAutoPlay() {
    if (this.images.length <= 1) return;
    this.autoPlayInterval = setInterval(() => this.nextSlide(), 4000);
  }

  pauseAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
      this.autoPlayInterval = null;
    }
  }

  resetAutoPlay() {
    this.pauseAutoPlay();
    this.startAutoPlay();
  }

  openImagePreview(i) {
    const img = this.images[i];
    this.modalFilename.textContent = img.teamName || img.filename;
    this.modalImage.classList.remove('loaded');
    this.previewLoading.style.display = 'block';
    
    const hiRes = new Image();
    hiRes.onload = () => {
      this.modalImage.src = img.src;
      this.modalImage.classList.add('loaded');
      this.previewLoading.style.display = 'none';
    };
    hiRes.onerror = () => {
      this.previewLoading.style.display = 'none';
      this.modalImage.alt = 'Failed to load image';
    };
    hiRes.src = img.src;

    this.imageModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    this.pauseAutoPlay();
  }

  closeImagePreview() {
    this.imageModal.classList.remove('active');
    document.body.style.overflow = '';
    this.startAutoPlay();
  }

  openVotingForm() {
    this.votingModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    this.pauseAutoPlay();
  }

  closeVotingForm() {
    this.votingModal.classList.remove('active');
    document.body.style.overflow = '';
    this.startAutoPlay();
  }

  downloadImage() {
    const img = this.images[this.currentSlide];
    const a = document.createElement('a');
    a.href = img.src;
    a.download = img.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async copyImage() {
    const img = this.images[this.currentSlide];
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const res = await fetch(img.src);
        const blob = await res.blob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        console.log('Image copied to clipboard');
      } else {
        await navigator.clipboard.writeText(img.src);
        console.log('Image URL copied to clipboard');
      }
    } catch (err) {
      console.error('Copy failed', err);
      // Fallback: copy URL to clipboard
      try {
        await navigator.clipboard.writeText(img.src);
        console.log('Image URL copied as fallback');
      } catch (fallbackErr) {
        console.error('Fallback copy also failed', fallbackErr);
      }
    }
  }

  showLoading() { 
    this.loadingState.style.display = 'block'; 
    this.carouselContainer.style.display = 'none';
    this.dotsContainer.style.display = 'none';
  }

  hideLoading() { 
    this.loadingState.style.display = 'none'; 
  }

  showCarousel() {
    this.carouselContainer.style.display = 'flex';
    this.dotsContainer.style.display = 'flex';
  }

  showError(msg) {
    this.errorState.querySelector('p').textContent = msg;
    this.errorState.style.display = 'block';
    this.carouselContainer.style.display = 'none';
    this.dotsContainer.style.display = 'none';
  }
}

// Initialize the gallery when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new ImageGallery();
});