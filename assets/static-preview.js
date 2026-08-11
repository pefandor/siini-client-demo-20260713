(function () {
  var message = 'В демо-версии оформление заказа недоступно';

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

  function blockUrl(url) {
    if (!url) return false;
    var adminPath = 'wp' + '-admin';
    var apiPath = 'wp' + '-json';
    return /\/checkout\/?$/.test(url) ||
      /\?wc-ajax=/.test(url) ||
      url.indexOf('/' + adminPath + '/') !== -1 ||
      url.indexOf('/' + apiPath + '/') !== -1 ||
      /add-to-cart=/.test(url) ||
      /\/\?s=/.test(url);
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('a, button');
    if (!trigger) return;

    if (trigger.matches('.single_add_to_cart_button, .add_to_cart_button, [data-siini-card-cta], .wc-block-mini-cart__button, .wc-block-mini-cart__footer-checkout, .wc-block-mini-cart__footer-cart, .siini-favorite-button, .siini-home-product-card__favorite, [data-static-preview-action]')) {
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
    if (form.dataset.staticPreview || blockUrl(action) || form.matches('.woocommerce-product-search, .search-form, .wc-block-product-search')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showNotice();
    }
  }, true);
})();
