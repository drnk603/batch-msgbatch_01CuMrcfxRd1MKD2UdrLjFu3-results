(function() {
  'use strict';

  if (window.__appInitialized) return;
  window.__appInitialized = true;

  const STATE = {
    mobileBreakpoint: 1024,
    headerHeight: 70,
    scrollThreshold: 300,
    formSubmitting: false
  };

  const SELECTORS = {
    header: '.l-header, .navbar',
    navToggle: '.c-nav__toggle, .navbar-toggler',
    navCollapse: '.navbar-collapse',
    navLink: '.nav-link',
    cookieBanner: '#cookie-banner, #cookieBanner',
    cookieAccept: '#cookie-accept, #acceptCookies',
    cookieDecline: '#cookie-decline, #declineCookies',
    forms: 'form',
    scrollToTop: '.c-scroll-to-top'
  };

  const REGEX = {
    email: /^[^s@]+@[^s@]+.[^s@]+$/,
    phone: /^[ds+-()]{10,20}$/,
    name: /^[a-zA-ZÀ-ÿs-']{2,50}$/
  };

  function debounce(fn, delay) {
    let timer;
    return function() {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, arguments), delay);
    };
  }

  function getHeaderHeight() {
    const header = document.querySelector(SELECTORS.header);
    return header ? header.offsetHeight : STATE.headerHeight;
  }

  class BurgerMenu {
    constructor() {
      this.toggle = document.querySelector(SELECTORS.navToggle);
      this.collapse = document.querySelector(SELECTORS.navCollapse);
      this.links = document.querySelectorAll(SELECTORS.navLink);
      this.isOpen = false;

      if (!this.toggle || !this.collapse) return;
      this.init();
    }

    init() {
      this.toggle.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleMenu();
      });

      this.links.forEach(link => {
        link.addEventListener('click', () => {
          if (this.isOpen) this.closeMenu();
        });
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) this.closeMenu();
      });

      window.addEventListener('resize', debounce(() => {
        if (window.innerWidth >= STATE.mobileBreakpoint && this.isOpen) {
          this.closeMenu();
        }
      }, 200));
    }

    toggleMenu() {
      this.isOpen ? this.closeMenu() : this.openMenu();
    }

    openMenu() {
      this.isOpen = true;
      this.collapse.classList.add('show');
      this.toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('u-no-scroll');
    }

    closeMenu() {
      this.isOpen = false;
      this.collapse.classList.remove('show');
      this.toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('u-no-scroll');
    }
  }

  class SmoothScroll {
    constructor() {
      this.init();
    }

    init() {
      document.addEventListener('click', (e) => {
        const target = e.target.closest('a[href^="#"], a[href*="#"]');
        if (!target) return;

        const href = target.getAttribute('href');
        if (!href || href === '#' || href === '#!') return;

        const hashIndex = href.indexOf('#');
        if (hashIndex === -1) return;

        const hash = href.substring(hashIndex + 1);
        if (!hash) return;

        const path = href.substring(0, hashIndex);
        const currentPath = window.location.pathname;
        const isSamePage = !path || path === '/' || path === '/index.html' || path === currentPath;

        if (!isSamePage) return;

        e.preventDefault();
        const element = document.getElementById(hash);
        if (!element) return;

        const offsetTop = element.getBoundingClientRect().top + window.pageYOffset - getHeaderHeight();
        window.scrollTo({ top: offsetTop, behavior: 'smooth' });
        window.history.pushState(null, null, '#' + hash);
      });
    }
  }

  class ActiveMenu {
    constructor() {
      this.links = document.querySelectorAll(SELECTORS.navLink);
      this.sections = [];
      this.init();
    }

    init() {
      this.updateActiveLink();

      this.links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.includes('#')) {
          const hash = href.split('#')[1];
          const section = document.getElementById(hash);
          if (section) {
            this.sections.push({ link, section });
          }
        }
      });

      if (this.sections.length > 0) {
        window.addEventListener('scroll', debounce(() => this.onScroll(), 100));
      }
    }

    updateActiveLink() {
      const currentPath = window.location.pathname;
      this.links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;

        const linkPath = href.split('#')[0];
        if (linkPath === currentPath || 
            (currentPath === '/' && (linkPath === '/' || linkPath === '/index.html')) ||
            (currentPath === '/index.html' && linkPath === '/')) {
          link.classList.add('active');
          link.setAttribute('aria-current', 'page');
        } else {
          link.classList.remove('active');
          link.removeAttribute('aria-current');
        }
      });
    }

    onScroll() {
      const scrollPos = window.pageYOffset + getHeaderHeight() + 50;

      for (let i = this.sections.length - 1; i >= 0; i--) {
        const { link, section } = this.sections[i];
        if (section.offsetTop <= scrollPos) {
          this.sections.forEach(s => s.link.classList.remove('active'));
          link.classList.add('active');
          break;
        }
      }
    }
  }

  class FormValidator {
    constructor() {
      this.forms = document.querySelectorAll(SELECTORS.forms);
      this.init();
    }

    init() {
      this.forms.forEach(form => {
        form.addEventListener('submit', (e) => this.handleSubmit(e, form));
      });
    }

    handleSubmit(e, form) {
      e.preventDefault();

      if (STATE.formSubmitting) return;

      form.classList.add('was-validated');

      const fields = this.getFormFields(form);
      const errors = this.validateFields(fields);

      this.clearErrors(form);

      if (errors.length > 0) {
        this.showErrors(errors);
        return;
      }

      this.submitForm(form, fields);
    }

    getFormFields(form) {
      const fields = {};
      const inputs = form.querySelectorAll('input, select, textarea');

      inputs.forEach(input => {
        if (input.name) {
          fields[input.name] = {
            element: input,
            value: input.value.trim(),
            type: input.type,
            required: input.hasAttribute('required') || input.hasAttribute('aria-required')
          };
        }
      });

      return fields;
    }

    validateFields(fields) {
      const errors = [];

      Object.entries(fields).forEach(([name, field]) => {
        if (!field.required && !field.value) return;

        if (field.required && !field.value) {
          errors.push({ element: field.element, message: 'Dit veld is verplicht' });
          return;
        }

        if (name.includes('name') || name.includes('Name')) {
          if (!REGEX.name.test(field.value)) {
            errors.push({ element: field.element, message: 'Voer een geldige naam in (2-50 tekens)' });
          }
        }

        if (field.type === 'email' || name.includes('email')) {
          if (!REGEX.email.test(field.value)) {
            errors.push({ element: field.element, message: 'Voer een geldig e-mailadres in' });
          }
        }

        if (field.type === 'tel' || name.includes('phone')) {
          if (!REGEX.phone.test(field.value)) {
            errors.push({ element: field.element, message: 'Voer een geldig telefoonnummer in' });
          }
        }

        if (field.type === 'checkbox' && field.required) {
          if (!field.element.checked) {
            errors.push({ element: field.element, message: 'U moet akkoord gaan met de voorwaarden' });
          }
        }

        if (name === 'message' && field.value.length < 10) {
          errors.push({ element: field.element, message: 'Bericht moet minimaal 10 tekens bevatten' });
        }
      });

      return errors;
    }

    showErrors(errors) {
      errors.forEach(({ element, message }) => {
        element.classList.add('is-invalid');

        let feedback = element.parentElement.querySelector('.invalid-feedback');
        if (!feedback) {
          feedback = document.createElement('div');
          feedback.className = 'invalid-feedback';
          element.parentElement.appendChild(feedback);
        }
        feedback.textContent = message;
      });

      this.notify('Vul alle verplichte velden correct in', 'warning');
    }

    clearErrors(form) {
      form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
      form.querySelectorAll('.invalid-feedback').forEach(el => el.textContent = '');
    }

    submitForm(form, fields) {
      STATE.formSubmitting = true;

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.innerHTML : '';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Verzenden...';
      }

      setTimeout(() => {
        STATE.formSubmitting = false;

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }

        this.notify('Bedankt! Uw bericht is verzonden.', 'success');
        form.reset();
        form.classList.remove('was-validated');

        setTimeout(() => {
          window.location.href = 'thank_you.html';
        }, 1500);
      }, 1500);
    }

    notify(message, type = 'info') {
      const container = this.getNotificationContainer();
      const alert = document.createElement('div');
      alert.className = `alert alert-${type} alert-dismissible fade show`;
      alert.setAttribute('role', 'alert');
      alert.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
      
      container.appendChild(alert);

      setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 150);
      }, 5000);
    }

    getNotificationContainer() {
      let container = document.getElementById('notification-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'position-fixed top-0 end-0 p-3';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
      }
      return container;
    }
  }

  class CookieBanner {
    constructor() {
      this.banner = document.querySelector(SELECTORS.cookieBanner);
      this.acceptBtn = document.querySelector(SELECTORS.cookieAccept);
      this.declineBtn = document.querySelector(SELECTORS.cookieDecline);

      if (!this.banner) return;
      this.init();
    }

    init() {
      const consent = localStorage.getItem('cookie-consent');
      if (!consent) {
        setTimeout(() => this.banner.classList.add('show'), 1000);
      }

      if (this.acceptBtn) {
        this.acceptBtn.addEventListener('click', () => this.accept());
      }

      if (this.declineBtn) {
        this.declineBtn.addEventListener('click', () => this.decline());
      }
    }

    accept() {
      localStorage.setItem('cookie-consent', 'accepted');
      this.hide();
    }

    decline() {
      localStorage.setItem('cookie-consent', 'declined');
      this.hide();
    }

    hide() {
      this.banner.classList.remove('show');
      setTimeout(() => {
        this.banner.style.display = 'none';
      }, 300);
    }
  }

  class ScrollToTop {
    constructor() {
      this.button = document.querySelector(SELECTORS.scrollToTop);
      if (!this.button) this.createButton();
      this.init();
    }

    createButton() {
      this.button = document.createElement('button');
      this.button.className = 'c-scroll-to-top';
      this.button.setAttribute('aria-label', 'Scroll naar boven');
      this.button.innerHTML = '↑';
      this.button.style.cssText = 'position:fixed;bottom:2rem;right:2rem;width:48px;height:48px;background:var(--color-primary);border:none;border-radius:50%;color:var(--color-neutral-900);font-size:1.5rem;cursor:pointer;opacity:0;visibility:hidden;transition:opacity 0.3s,visibility 0.3s;z-index:500;box-shadow:0 4px 12px rgba(212,175,55,0.3)';
      document.body.appendChild(this.button);
    }

    init() {
      window.addEventListener('scroll', debounce(() => {
        if (window.pageYOffset > STATE.scrollThreshold) {
          this.button.style.opacity = '1';
          this.button.style.visibility = 'visible';
        } else {
          this.button.style.opacity = '0';
          this.button.style.visibility = 'hidden';
        }
      }, 100));

      this.button.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  class LazyLoading {
    constructor() {
      this.init();
    }

    init() {
      document.querySelectorAll('img, video').forEach(media => {
        if (!media.hasAttribute('loading')) {
          const isCritical = media.classList.contains('c-logo__img') || 
                           media.hasAttribute('data-critical');
          if (!isCritical) {
            media.setAttribute('loading', 'lazy');
          }
        }
      });
    }
  }

  function init() {
    new BurgerMenu();
    new SmoothScroll();
    new ActiveMenu();
    new FormValidator();
    new CookieBanner();
    new ScrollToTop();
    new LazyLoading();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
