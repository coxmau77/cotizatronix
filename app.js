(function () {
  'use strict';

  const VALID_KEY = 'COTIZ-2024';
  const STORAGE_KEYS = {
    session: 'cotizatronix_session',
    theme: 'cotizatronix_theme'
  };

  let scrollLockCount = 0;

  function lockScroll() {
    scrollLockCount++;
    document.body.style.overflow = 'hidden';
  }

  function unlockScroll() {
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount === 0) {
      document.body.style.overflow = '';
    }
  }

  function createBackdrop(zIndex, staticBackdrop) {
    const el = document.createElement('div');
    el.className = zIndex === 1050 ? 'modal-backdrop' : 'offcanvas-backdrop';
    el.style.zIndex = zIndex;
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    return el;
  }

  function removeBackdrop(el) {
    if (!el) return;
    el.classList.remove('show');
    el.addEventListener('transitionend', function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, { once: true });
  }

  function getFocusable(el) {
    return el.querySelectorAll('a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])');
  }

  var Offcanvas = function (selector) {
    this.el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    this.backdrop = null;
    this.isOpen = false;
    var self = this;
    this.el.querySelectorAll('[data-dismiss="offcanvas"]').forEach(function (btn) {
      btn.addEventListener('click', function () { self.hide(); });
    });
  };

  Offcanvas.prototype.show = function () {
    if (this.isOpen) return;
    this.el.classList.add('show');
    this.backdrop = createBackdrop(1040);
    this.isOpen = true;
    lockScroll();
  };

  Offcanvas.prototype.hide = function () {
    if (!this.isOpen) return;
    this.el.classList.remove('show');
    removeBackdrop(this.backdrop);
    this.backdrop = null;
    this.isOpen = false;
    unlockScroll();
  };

  Offcanvas.prototype.toggle = function () {
    this.isOpen ? this.hide() : this.show();
  };

  var Modal = function (selector, options) {
    this.el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    this.options = options || {};
    this.backdrop = null;
    this.isOpen = false;
    this.lastFocus = null;
    this.dismissButtons = this.el.querySelectorAll('[data-dismiss="modal"]');
  };

  Modal.prototype.show = function () {
    if (this.isOpen) return;
    this.lastFocus = document.activeElement;
    this.el.classList.add('show');

    if (this.options.backdrop !== 'static') {
      this.backdrop = createBackdrop(1050);
      var self = this;
      this.backdrop.addEventListener('click', function () { self.hide(); });
    } else {
      this.backdrop = createBackdrop(1050, true);
    }

    this.isOpen = true;
    lockScroll();
    trapFocus(this);
  };

  Modal.prototype.hide = function () {
    if (!this.isOpen) return;
    this.el.classList.remove('show');
    removeBackdrop(this.backdrop);
    this.backdrop = null;
    this.isOpen = false;
    unlockScroll();
    if (this.lastFocus) this.lastFocus.focus();
  };

  function trapFocus(instance) {
    var focusable = getFocusable(instance.el);
    if (focusable.length) focusable[0].focus();

    function handler(e) {
      if (e.key !== 'Tab') return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    instance.el.addEventListener('keydown', handler);
    instance._focusHandler = handler;
  }

  Modal.prototype._focusHandler = null;

  var Dropdown = function (trigger) {
    this.trigger = typeof trigger === 'string' ? document.querySelector(trigger) : trigger;
    this.menu = this.trigger.nextElementSibling;
    this.isOpen = false;
  };

  Dropdown.prototype.toggle = function () {
    this.isOpen ? this.hide() : this.show();
  };

  Dropdown.prototype.show = function () {
    if (this.isOpen) return;
    this.menu.classList.add('show');
    this.isOpen = true;

    var self = this;
    function closeHandler(e) {
      if (!self.menu.contains(e.target) && !self.trigger.contains(e.target)) {
        self.hide();
      }
    }

    function escHandler(e) {
      if (e.key === 'Escape') self.hide();
    }

    document.addEventListener('click', closeHandler);
    document.addEventListener('keydown', escHandler);

    self.trigger._dropdownClose = closeHandler;
    self.trigger._dropdownEsc = escHandler;
  };

  Dropdown.prototype.hide = function () {
    if (!this.isOpen) return;
    this.menu.classList.remove('show');
    this.isOpen = false;
    document.removeEventListener('click', this.trigger._dropdownClose);
    document.removeEventListener('keydown', this.trigger._dropdownEsc);
  };

  var el = function (id) { return document.getElementById(id); };

  var $ = {
    userSection: el('userSection'),
    userName: el('userName'),
    userEmail: el('userEmail'),
    loginBtn: el('loginBtn'),
    accessKey: el('accessKey'),
    loginError: el('loginError'),
    logoutBtn: el('logoutBtn'),
    themeToggle: el('themeToggle'),
    themeIcon: el('themeIcon'),
    themeLabel: el('themeLabel')
  };

  function init() {
    initControllers();
    var session = loadSession();
    var theme = loadTheme();
    setTheme(theme);
    if (session) {
      setUser(session);
    } else {
      var loginModal = new Modal('#loginModal', { backdrop: 'static' });
      loginModal.show();
      window._loginModal = loginModal;
    }
    bindEvents();
  }

  function initControllers() {
    document.querySelectorAll('[data-toggle="offcanvas"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = document.querySelector(btn.getAttribute('data-target'));
        if (!target) return;
        var oc = target._offcanvas || new Offcanvas(target);
        target._offcanvas = oc;
        oc.toggle();
      });
    });

    document.querySelectorAll('[data-toggle="dropdown"]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var dd = btn._dropdown || new Dropdown(btn);
        btn._dropdown = dd;
        dd.toggle();
      });
    });
  }

  function bindEvents() {
    $.loginBtn.addEventListener('click', handleLogin);
    $.accessKey.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') handleLogin();
    });
    $.logoutBtn.addEventListener('click', handleLogout);
    $.themeToggle.addEventListener('click', toggleTheme);
  }

  function handleLogin() {
    var key = $.accessKey.value.trim();
    if (key === VALID_KEY) {
      var session = {
        name: 'Mauricio Cox',
        email: 'mauricio@cotizatronix.com',
        authenticated: true
      };
      saveSession(session);
      setUser(session);
      resetLoginForm();
      if (window._loginModal) window._loginModal.hide();
    } else {
      $.accessKey.classList.add('is-invalid');
      $.loginError.classList.add('d-block');
    }
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEYS.session);
    $.userSection.classList.add('d-none');
    resetLoginForm();
    var loginModal = new Modal('#loginModal', { backdrop: 'static' });
    loginModal.show();
    window._loginModal = loginModal;
  }

  function setUser(session) {
    $.userName.textContent = session.name;
    $.userEmail.textContent = session.email;
    $.userSection.classList.remove('d-none');
  }

  function resetLoginForm() {
    $.accessKey.value = '';
    $.accessKey.classList.remove('is-invalid');
    $.loginError.classList.remove('d-block');
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.theme, theme);
    var isDark = theme === 'dark';
    $.themeLabel.textContent = isDark ? 'Modo claro' : 'Modo oscuro';
    $.themeIcon.innerHTML = isDark
      ? '<img src="assets/icons/sun.svg" alt="Modo claro" width="16" height="16" class="icon-img">'
      : '<img src="assets/icons/moon.svg" alt="Modo oscuro" width="16" height="16" class="icon-img">';
  }

  function loadSession() {
    try {
      var data = localStorage.getItem(STORAGE_KEYS.session);
      var session = data ? JSON.parse(data) : null;
      return session && session.authenticated ? session : null;
    } catch (e) {
      return null;
    }
  }

  function saveSession(session) {
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
  }

  function loadTheme() {
    return localStorage.getItem(STORAGE_KEYS.theme) || 'light';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
