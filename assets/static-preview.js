(function () {
  var message = 'Это действие доступно на рабочем сайте.';

  function showNotice() {
    var existing = document.querySelector('.siini-static-demo-notice');
    if (existing) {
      existing.classList.add('is-visible');
      window.clearTimeout(existing._hideTimer);
      existing._hideTimer = window.setTimeout(function () {
        existing.classList.remove('is-visible');
      }, 2600);
      return;
    }

    var notice = document.createElement('div');
    notice.className = 'siini-static-demo-notice is-visible';
    notice.textContent = message;
    document.body.appendChild(notice);
    notice._hideTimer = window.setTimeout(function () {
      notice.classList.remove('is-visible');
    }, 2600);
  }

  window.siiniStaticDemoNotice = showNotice;

  function blockUrl(url) {
    if (!url) return false;
    var adminPath = 'wp' + '-admin';
    var apiPath = 'wp' + '-json';
    return /\?wc-ajax=/.test(url) ||
      url.indexOf('/' + adminPath + '/') !== -1 ||
      url.indexOf('/' + apiPath + '/') !== -1 ||
      /add-to-cart=/.test(url);
  }

  function toggleFavorite(trigger) {
    var active = trigger.getAttribute('aria-pressed') === 'true';
    var next = active ? 'false' : 'true';
    var count = 0;
    trigger.setAttribute('aria-pressed', next);
    trigger.setAttribute('aria-label', active ? 'Добавить в избранное' : 'Убрать из избранного');
    trigger.textContent = active ? '♡' : '♥';
    document.querySelectorAll('[data-siini-favorite-toggle][aria-pressed="true"]').forEach(function () {
      count += 1;
    });
    document.querySelectorAll('[data-siini-favorites-count]').forEach(function (node) {
      node.textContent = String(count);
      node.hidden = count === 0;
    });
  }

  function submitStaticSearch(form) {
    var query = form.querySelector('[name="s"]');
    var value = query ? query.value.trim() : '';
    if (!value) {
      if (query) query.focus();
      return;
    }

    var target = new URL(form.getAttribute('action') || window.location.href, window.location.href);
    target.searchParams.set('s', value);
    window.location.assign(target.href);
  }

  function applyStaticSearchResults() {
    var query;
    var normalized;
    var matched = 0;

    if (!/\/shop\/(?:index\.html)?$/.test(window.location.pathname)) return;
    query = new URLSearchParams(window.location.search).get('s') || '';
    normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return;

    document.querySelectorAll('[data-siini-product-card]').forEach(function (card) {
      var isMatch = card.textContent.toLocaleLowerCase().indexOf(normalized) !== -1;
      card.hidden = !isMatch;
      if (isMatch) matched += 1;
    });
    document.title = 'Поиск: ' + query.trim() + ' - SINI';
    document.documentElement.dataset.siiniStaticSearchMatches = String(matched);
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('a, button');
    if (!trigger) return;

    if (trigger.matches('[data-siini-favorite-toggle]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleFavorite(trigger);
      return;
    }

    if (trigger.matches('.single_add_to_cart_button, .add_to_cart_button, [data-siini-card-cta], [data-static-preview-action]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showNotice();
      return;
    }

    if (trigger.tagName === 'A' && (blockUrl(trigger.getAttribute('href') || '') || trigger.getAttribute('href') === '#')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showNotice();
    }
  }, true);

  document.addEventListener('submit', function (event) {
    var form = event.target;
    var action = form.getAttribute('action') || window.location.href;
    if (form.matches('.siini-product-search__form')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      submitStaticSearch(form);
      return;
    }

    if (form.dataset.staticPreview || blockUrl(action)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showNotice();
    }
  }, true);

  document.addEventListener('keydown', function (event) {
    var input = event.target;
    var form;
    if (event.key !== 'Enter' || !input.matches('[data-siini-search-input]')) return;
    form = input.closest('.siini-product-search__form');
    if (!form) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    submitStaticSearch(form);
  }, true);

  applyStaticSearchResults();
})();