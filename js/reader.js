/**
 * Lector Manga de Alto Rendimiento - Demon Slayer
 * Mozilla PDF.js Core con modos Libro 3D & Webtoon
 */

class MangaReader {
  constructor(app) {
    this.app = app;
    this.currentChapter = null;
    this.pdfDoc = null;
    this.currentPage = 1;
    this.totalPages = 0;
    this.readingMode = 'book'; // 'book' | 'webtoon'
    this.direction = 'rtl';    // 'rtl' (japonés) | 'ltr' (occidental)
    this.theme = 'dark';       // 'dark' | 'paper'
    this.zoomLevel = 1.0;
    this.isUiVisible = true;
    this.renderTask = null;
    this.isRendering = false;

    // Elementos DOM
    this.modal = document.getElementById('reader-modal');
    this.viewport = document.getElementById('reader-viewport');
    this.pagesContainer = document.getElementById('reader-pages');
    this.webtoonContainer = document.getElementById('webtoon-container');
    this.topbar = document.getElementById('reader-topbar');
    this.bottombar = document.getElementById('reader-bottombar');
    this.titleEl = document.getElementById('reader-chapter-title');
    this.subtitleEl = document.getElementById('reader-chapter-arc');
    this.pageIndicator = document.getElementById('reader-page-indicator');
    this.scrubber = document.getElementById('reader-scrubber');
    this.loader = document.getElementById('reader-loader');
    this.loaderText = document.getElementById('reader-loader-text');
    this.drawer = document.getElementById('chapter-drawer');

    // Configuración de PDF.js
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = './js/vendor/pdf.worker.min.js';
    }

    this.bindEvents();
  }

  bindEvents() {
    // Botón Volver / Cerrar
    document.getElementById('btn-close-reader')?.addEventListener('click', () => this.close());

    // Botones de Modo de Lectura
    document.getElementById('btn-mode-book')?.addEventListener('click', () => this.setMode('book'));
    document.getElementById('btn-mode-webtoon')?.addEventListener('click', () => this.setMode('webtoon'));

    // Botón de Dirección RTL/LTR
    const dirBtn = document.getElementById('btn-toggle-direction');
    dirBtn?.addEventListener('click', () => {
      this.direction = this.direction === 'rtl' ? 'ltr' : 'rtl';
      dirBtn.textContent = this.direction === 'rtl' ? '右 RTL' : '左 LTR';
      this.render();
    });

    // Botón de Tema (Oscuro vs Papel)
    document.getElementById('btn-toggle-theme')?.addEventListener('click', () => {
      this.theme = this.theme === 'dark' ? 'paper' : 'dark';
      this.modal.classList.toggle('theme-paper', this.theme === 'paper');
      this.modal.classList.toggle('theme-dark', this.theme === 'dark');
    });

    // Botón Pantalla Completa
    document.getElementById('btn-fullscreen')?.addEventListener('click', () => this.toggleFullscreen());

    // Botones Anterior / Siguiente
    document.getElementById('btn-prev-page')?.addEventListener('click', () => this.prevPage());
    document.getElementById('btn-next-page')?.addEventListener('click', () => this.nextPage());

    // Slider de arrastre de páginas (Scrubber)
    this.scrubber?.addEventListener('input', (e) => {
      const page = parseInt(e.target.value, 10);
      this.goToPage(page);
    });

    // Zonas de toque en pantalla (Móviles / Tablets)
    document.getElementById('tap-zone-left')?.addEventListener('click', () => {
      if (this.readingMode === 'book') {
        // En RTL manga, la izquierda es AVANZAR a la siguiente página
        this.direction === 'rtl' ? this.nextPage() : this.prevPage();
      }
    });

    document.getElementById('tap-zone-right')?.addEventListener('click', () => {
      if (this.readingMode === 'book') {
        // En RTL manga, la derecha es RETROCEDER a la página anterior
        this.direction === 'rtl' ? this.prevPage() : this.nextPage();
      }
    });

    document.getElementById('tap-zone-center')?.addEventListener('click', () => {
      this.toggleUi();
    });

    // Drawer de capítulos
    document.getElementById('btn-open-drawer')?.addEventListener('click', () => {
      this.drawer?.classList.add('open');
    });
    document.getElementById('btn-close-drawer')?.addEventListener('click', () => {
      this.drawer?.classList.remove('open');
    });

    // Atajos de teclado para PC
    window.addEventListener('keydown', (e) => {
      if (!this.modal.classList.contains('active')) return;
      if (e.key === 'ArrowRight') {
        this.direction === 'rtl' ? this.prevPage() : this.nextPage();
      } else if (e.key === 'ArrowLeft') {
        this.direction === 'rtl' ? this.nextPage() : this.prevPage();
      } else if (e.key === 'Escape') {
        if (this.drawer?.classList.contains('open')) {
          this.drawer.classList.remove('open');
        } else {
          this.close();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        this.toggleFullscreen();
      }
    });

    // Gestos táctiles de deslizamiento (Swipe)
    this.setupTouchGestures();

    // Redimensionamiento
    window.addEventListener('resize', () => {
      if (this.modal.classList.contains('active') && this.readingMode === 'book') {
        this.render();
      }
    });
  }

  setupTouchGestures() {
    let touchStartX = 0;
    let touchStartY = 0;

    this.viewport.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    this.viewport.addEventListener('touchend', (e) => {
      if (this.readingMode !== 'book') return;
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;

      // Deslizamiento horizontal detectado
      if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX < 0) {
          // Swipe a la izquierda -> En RTL es página siguiente
          this.direction === 'rtl' ? this.nextPage() : this.prevPage();
        } else {
          // Swipe a la derecha -> En RTL es página anterior
          this.direction === 'rtl' ? this.prevPage() : this.nextPage();
        }
      }
    }, { passive: true });
  }

  async loadChapter(chapter, initialPage = 1) {
    this.currentChapter = chapter;
    this.currentPage = initialPage;
    this.titleEl.textContent = chapter.title;
    this.subtitleEl.textContent = chapter.arc;
    this.modal.classList.add('active');

    // Pausar partículas de fondo para maximizar FPS
    if (window.sakuraInstance) window.sakuraInstance.pause();

    this.showLoader(`Cargando ${chapter.title}...`);

    try {
      if (this.pdfDoc) {
        this.pdfDoc.destroy();
      }

      const loadingTask = window.pdfjsLib.getDocument({
        url: chapter.pdfFile,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true
      });

      this.pdfDoc = await loadingTask.promise;
      this.totalPages = this.pdfDoc.numPages;

      this.scrubber.max = this.totalPages;
      this.scrubber.value = this.currentPage;

      this.populateDrawer();
      await this.render();
      this.hideLoader();
    } catch (err) {
      console.error('Error al cargar PDF:', err);
      this.showLoader('Error al abrir el capítulo. Revisa tu conexión.');
    }
  }

  async render() {
    if (!this.pdfDoc) return;

    this.updateControls();
    this.saveProgress();

    if (this.readingMode === 'book') {
      await this.renderBookMode();
    } else {
      await this.renderWebtoonMode();
    }
  }

  async renderBookMode() {
    this.pagesContainer.style.display = 'flex';
    this.webtoonContainer.style.display = 'none';
    this.pagesContainer.innerHTML = '';

    const isLandscape = window.innerWidth > 960 && window.innerWidth > window.innerHeight;
    const isDualPage = isLandscape && this.totalPages > 1;

    // En manga dual: página impar a la derecha, par a la izquierda en RTL
    let pagesToRender = [this.currentPage];
    if (isDualPage && this.currentPage < this.totalPages) {
      pagesToRender.push(this.currentPage + 1);
      if (this.direction === 'rtl') {
        pagesToRender.reverse(); // En japonés, derecha es pág 1, izquierda es pág 2
      }
    }

    for (const pageNum of pagesToRender) {
      const page = await this.pdfDoc.getPage(pageNum);
      const canvas = document.createElement('canvas');
      canvas.className = 'manga-page-canvas';
      this.pagesContainer.appendChild(canvas);

      const ctx = canvas.getContext('2d');
      const containerHeight = this.viewport.clientHeight - (this.isUiVisible ? 120 : 20);
      const containerWidth = (this.viewport.clientWidth / pagesToRender.length) - 20;

      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const scaleHeight = containerHeight / unscaledViewport.height;
      const scaleWidth = containerWidth / unscaledViewport.width;
      const fitScale = Math.min(scaleHeight, scaleWidth) * this.zoomLevel;

      const viewport = page.getViewport({ scale: fitScale });
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Nitidez Retina

      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const renderContext = {
        canvasContext: ctx,
        transform: [dpr, 0, 0, dpr, 0, 0],
        viewport: viewport
      };

      await page.render(renderContext).promise;
    }
  }

  async renderWebtoonMode() {
    this.pagesContainer.style.display = 'none';
    this.webtoonContainer.style.display = 'flex';
    this.webtoonContainer.innerHTML = '';

    // Generar contenedores placeholder para todas las páginas
    for (let i = 1; i <= this.totalPages; i++) {
      const wrapper = document.createElement('div');
      wrapper.className = 'webtoon-page-wrapper';
      wrapper.id = `webtoon-page-${i}`;
      wrapper.dataset.page = i;

      const canvas = document.createElement('canvas');
      wrapper.appendChild(canvas);
      this.webtoonContainer.appendChild(wrapper);
    }

    // Lazy render con IntersectionObserver
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(async (entry) => {
        if (entry.isIntersecting) {
          const wrapper = entry.target;
          const pageNum = parseInt(wrapper.dataset.page, 10);
          const canvas = wrapper.querySelector('canvas');
          if (!wrapper.dataset.rendered) {
            wrapper.dataset.rendered = 'true';
            await this.renderSingleCanvas(pageNum, canvas);
          }
          this.currentPage = pageNum;
          this.updateControls();
          this.saveProgress();
        }
      });
    }, { root: this.webtoonContainer, rootMargin: '300px' });

    document.querySelectorAll('.webtoon-page-wrapper').forEach((el) => observer.observe(el));

    // Scroll inicial
    if (this.currentPage > 1) {
      setTimeout(() => {
        const target = document.getElementById(`webtoon-page-${this.currentPage}`);
        target?.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    }
  }

  async renderSingleCanvas(pageNum, canvas) {
    const page = await this.pdfDoc.getPage(pageNum);
    const ctx = canvas.getContext('2d');
    const targetWidth = Math.min(this.webtoonContainer.clientWidth - 20, 800);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const scale = targetWidth / unscaledViewport.width;
    const viewport = page.getViewport({ scale });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    await page.render({
      canvasContext: ctx,
      transform: [dpr, 0, 0, dpr, 0, 0],
      viewport: viewport
    }).promise;
  }

  setMode(mode) {
    if (this.readingMode === mode) return;
    this.readingMode = mode;
    document.getElementById('btn-mode-book')?.classList.toggle('active', mode === 'book');
    document.getElementById('btn-mode-webtoon')?.classList.toggle('active', mode === 'webtoon');
    this.render();
  }

  nextPage() {
    const step = (window.innerWidth > 960 && window.innerWidth > window.innerHeight && this.readingMode === 'book') ? 2 : 1;
    if (this.currentPage + step <= this.totalPages) {
      this.currentPage += step;
      this.render();
    } else if (this.currentPage < this.totalPages) {
      this.currentPage = this.totalPages;
      this.render();
    } else {
      // Fin del capítulo: ofrecer pasar al siguiente
      this.promptNextChapter();
    }
  }

  prevPage() {
    const step = (window.innerWidth > 960 && window.innerWidth > window.innerHeight && this.readingMode === 'book') ? 2 : 1;
    if (this.currentPage - step >= 1) {
      this.currentPage -= step;
      this.render();
    } else if (this.currentPage > 1) {
      this.currentPage = 1;
      this.render();
    }
  }

  goToPage(pageNum) {
    if (pageNum >= 1 && pageNum <= this.totalPages) {
      this.currentPage = pageNum;
      this.render();
    }
  }

  updateControls() {
    this.pageIndicator.textContent = `Pág. ${this.currentPage} / ${this.totalPages}`;
    this.scrubber.value = this.currentPage;
  }

  toggleUi() {
    this.isUiVisible = !this.isUiVisible;
    this.topbar.classList.toggle('hidden', !this.isUiVisible);
    this.bottombar.classList.toggle('hidden', !this.isUiVisible);
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  showLoader(text) {
    this.loaderText.textContent = text;
    this.loader.classList.remove('hidden');
  }

  hideLoader() {
    this.loader.classList.add('hidden');
  }

  saveProgress() {
    if (!this.currentChapter) return;
    const progressData = {
      chapterId: this.currentChapter.id,
      title: this.currentChapter.title,
      page: this.currentPage,
      totalPages: this.totalPages,
      timestamp: Date.now(),
      completed: this.currentPage >= this.totalPages
    };
    localStorage.setItem('khaleesi_last_read', JSON.stringify(progressData));

    // Guardar estado individual del capítulo
    const history = JSON.parse(localStorage.getItem('khaleesi_chapter_history') || '{}');
    history[this.currentChapter.id] = {
      page: this.currentPage,
      totalPages: this.totalPages,
      completed: this.currentPage >= this.totalPages
    };
    localStorage.setItem('khaleesi_chapter_history', JSON.stringify(history));

    this.app.updateProgressUI();
  }

  populateDrawer() {
    const list = document.getElementById('drawer-chapter-list');
    if (!list) return;
    list.innerHTML = '';

    this.app.chapters.forEach((ch) => {
      const item = document.createElement('div');
      item.className = `drawer-item ${ch.id === this.currentChapter.id ? 'active' : ''}`;
      item.innerHTML = `
        <span>${ch.title}</span>
        <small style="opacity: 0.7;">${ch.pages} pág.</small>
      `;
      item.addEventListener('click', () => {
        this.drawer.classList.remove('open');
        this.app.openChapter(ch.id, 1);
      });
      list.appendChild(item);
    });
  }

  promptNextChapter() {
    const currentIndex = this.app.chapters.findIndex((c) => c.id === this.currentChapter.id);
    if (currentIndex < this.app.chapters.length - 1) {
      const nextChapter = this.app.chapters[currentIndex + 1];
      if (confirm(`¡Completaste este tomo! ¿Deseas continuar con el ${nextChapter.title}?`)) {
        this.app.openChapter(nextChapter.id, 1);
      }
    }
  }

  close() {
    this.modal.classList.remove('active');
    if (this.pdfDoc) {
      this.pdfDoc.destroy();
      this.pdfDoc = null;
    }
    if (window.sakuraInstance) window.sakuraInstance.resume();
  }
}

window.MangaReader = MangaReader;
