(() => {
  document.documentElement.classList.add('has-js');
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.mobile-menu');
  const navigation = document.querySelector('.main-nav');
  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 20);
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();
  toggle?.addEventListener('click', () => {
    const open = navigation.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  });
  navigation?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    navigation.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }));
  document.getElementById('ano').textContent = new Date().getFullYear().toString();
  const reveal = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .08, rootMargin: '0px 0px -35px 0px' });
    reveal.forEach(node => observer.observe(node));
  } else { reveal.forEach(node => node.classList.add('is-visible')); }
  const lightbox = document.querySelector('.lightbox');
  const image = lightbox?.querySelector('img');
  const close = lightbox?.querySelector('.lightbox-close');
  let formerFocus;
  function closeLightbox() {
    lightbox.hidden = true;lightbox.setAttribute('aria-hidden', 'true');
    image.removeAttribute('src');document.body.style.overflow='';formerFocus?.focus();
  }
  document.querySelectorAll('.gallery-item').forEach(button => button.addEventListener('click', () => {
    formerFocus = button; image.src = button.dataset.full;
    image.alt = button.dataset.alt || 'Foto da Rafa';
    lightbox.hidden = false; lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow='hidden';close.focus();
  }));
  close?.addEventListener('click', closeLightbox);
  lightbox?.addEventListener('click', event => { if (event.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && lightbox && !lightbox.hidden) closeLightbox();
  });
})();
