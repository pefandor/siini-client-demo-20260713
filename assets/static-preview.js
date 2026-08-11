(function () {
  'use strict';

  var KEY = 'siini.static-demo-cart.v1';
  var VERSION = 1;
  var MAX = 99;
  var DEFAULT_NOTICE = 'Это действие доступно на рабочем сайте.';

  window.addEventListener('error', function (event) {
    if (event && /(?:^|\s)(?:_|wp) is not defined$/.test(event.message || '')) event.preventDefault();
  }, true);

  function clean(value, limit) {
    return String(value == null ? '' : value).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit || 240);
  }

  function amount(value) {
    var parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0;
  }

  function count(value) {
    return Math.min(MAX, Math.max(1, amount(value) || 1));
  }

  function price(value) {
    return amount(String(value || '').replace(/[^0-9]/g, ''));
  }

  function rubles(value) {
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount(value)) + ' ₽';
  }

  function localUrl(value) {
    var raw = clean(value, 900);
    if (!raw || /^(?:javascript:|data:)/i.test(raw)) return '';
    try {
      var url = new URL(raw, window.location.href);
      return url.origin === window.location.origin ? url.pathname + url.search + url.hash : '';
    } catch (error) {
      return '';
    }
  }

  function item(value) {
    if (!value || typeof value !== 'object') return null;
    var productId = clean(value.productId, 48);
    var variationId = clean(value.variationId, 48);
    var size = clean(value.size, 48);
    var stableId = clean(value.stableId, 128);
    var title = clean(value.title, 240);
    if (!productId || !stableId || !title) return null;
    return {
      stableId: stableId,
      productId: productId,
      variationId: variationId,
      size: size,
      title: title,
      brand: clean(value.brand, 120),
      quantity: count(value.quantity),
      price: amount(value.price),
      image: localUrl(value.image),
      url: localUrl(value.url)
    };
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return { stored: false, items: [] };
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== VERSION || !Array.isArray(parsed.items)) return { stored: false, items: [] };
      var ids = {};
      return {
        stored: true,
        items: parsed.items.map(item).filter(function (entry) {
          if (!entry || ids[entry.stableId]) return false;
          ids[entry.stableId] = true;
          return true;
        })
      };
    } catch (error) {
      return { stored: false, items: [] };
    }
  }

  function save(items) {
    var safeItems = items.map(item).filter(Boolean);
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ version: VERSION, items: safeItems }));
      return { stored: true, items: safeItems };
    } catch (error) {
      notice('Не удалось сохранить демо-корзину в браузере.', false);
      return { stored: true, items: safeItems };
    }
  }

  function total(cart) {
    return cart.items.reduce(function (sum, entry) { return sum + entry.price * entry.quantity; }, 0);
  }

  function pieces(cart) {
    return cart.items.reduce(function (sum, entry) { return sum + entry.quantity; }, 0);
  }

  function notice(message, success) {
    var node = document.querySelector('.siini-static-demo-notice');
    if (!node) {
      node = document.createElement('div');
      node.className = 'siini-static-demo-notice';
      node.setAttribute('role', 'status');
      document.body.appendChild(node);
    }
    node.textContent = clean(message || DEFAULT_NOTICE, 240);
    node.classList.toggle('is-success', !!success);
    node.classList.add('is-visible');
    window.clearTimeout(node._hideTimer);
    node._hideTimer = window.setTimeout(function () { node.classList.remove('is-visible'); }, 2600);
  }

  window.siiniStaticDemoNotice = function () { notice(DEFAULT_NOTICE, false); };

  function add(entry, quantity) {
    var next = item(entry);
    if (!next) return;
    var cart = load();
    var previous = cart.items.find(function (saved) { return saved.stableId === next.stableId; });
    if (previous) previous.quantity = Math.min(MAX, previous.quantity + count(quantity));
    else { next.quantity = count(quantity); cart.items.push(next); }
    save(cart.items);
    render();
    notice('Товар добавлен в демо-корзину.', true);
  }

  function setQuantity(stableId, quantity) {
    var cart = load();
    if (!cart.stored) return;
    cart.items.forEach(function (entry) {
      if (entry.stableId === stableId) entry.quantity = count(quantity);
    });
    save(cart.items);
    render();
  }

  function remove(stableId) {
    var cart = load();
    if (!cart.stored) return;
    save(cart.items.filter(function (entry) { return entry.stableId !== stableId; }));
    render();
    notice('Товар удалён из демо-корзины.', true);
  }

  function handleCartControlClick(event) {
    var trigger = event.target.closest('[data-siini-demo-cart-remove], [data-siini-demo-cart-increase], [data-siini-demo-cart-decrease]');
    if (!trigger) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (trigger.matches('[data-siini-demo-cart-remove]')) {
      remove(trigger.dataset.siiniDemoCartRemove);
      return;
    }
    var stableId = trigger.dataset.siiniDemoCartIncrease || trigger.dataset.siiniDemoCartDecrease;
    var saved = load().items.find(function (entry) { return entry.stableId === stableId; });
    if (saved) setQuantity(stableId, saved.quantity + (trigger.matches('[data-siini-demo-cart-increase]') ? 1 : -1));
  }

  function blockUrl(url) {
    var value = String(url || '');
    return /\?wc-ajax=|add-to-cart=/.test(value) || value.indexOf('/static-preview-disabled/') !== -1 || value.indexOf('/static-preview-disabled/') !== -1;
  }

  function favorite(trigger) {
    var active = trigger.getAttribute('aria-pressed') === 'true';
    trigger.setAttribute('aria-pressed', active ? 'false' : 'true');
    trigger.setAttribute('aria-label', active ? 'Добавить в избранное' : 'Убрать из избранного');
    trigger.textContent = active ? '♡' : '♥';
    var selected = document.querySelectorAll('[data-siini-favorite-toggle][aria-pressed="true"]').length;
    document.querySelectorAll('[data-siini-favorites-count]').forEach(function (node) { node.textContent = String(selected); node.hidden = selected === 0; });
  }

  function selectedCardProduct(card) {
    var productId = clean(card.getAttribute('data-product-id'), 48);
    var isVariable = card.getAttribute('data-product-type') === 'variable';
    var size = card.querySelector('[data-siini-card-size][aria-pressed="true"]');
    if (!productId || (isVariable && !size)) return null;
    var variationId = size ? clean(size.getAttribute('data-variation-id'), 48) : '';
    var selectedSize = size ? clean(size.getAttribute('data-attribute-value') || size.textContent, 48) : '';
    return {
      stableId: productId + ':' + (variationId || selectedSize || 'base'),
      productId: productId,
      variationId: variationId,
      size: selectedSize,
      title: card.getAttribute('data-siini-favorite-title') || ((card.querySelector('h3') || {}).textContent || ''),
      brand: card.getAttribute('data-siini-favorite-brand') || ((card.querySelector('.siini-home-product-card__brand') || {}).textContent || ''),
      price: price((card.querySelector('[data-siini-card-current-price]') || {}).textContent),
      image: card.getAttribute('data-siini-favorite-image') || ((card.querySelector('img') || {}).getAttribute('src') || ''),
      url: card.getAttribute('data-siini-favorite-url') || ((card.querySelector('h3 a, .siini-home-product-card__media') || {}).getAttribute('href') || ''),
      quantity: 1
    };
  }

  function syncCard(card, cart) {
    var selected = selectedCardProduct(card);
    var saved = selected && cart.items.find(function (entry) { return entry.stableId === selected.stableId; });
    var added = card.querySelector('[data-siini-card-added]');
    var cta = card.querySelector('[data-siini-card-cta]');
    if (added) added.hidden = !saved;
    if (cta) cta.hidden = !!saved;
    card.querySelectorAll('[data-siini-card-added-count], [data-siini-card-quantity-value]').forEach(function (node) { node.textContent = String(saved ? saved.quantity : 1); });
    card.querySelectorAll('[data-siini-card-qty-minus]').forEach(function (node) { node.disabled = !saved || saved.quantity <= 1; });
  }

  function variation(form) {
    var select = form.querySelector('[name="attribute_pa_size"]');
    var size = clean(select ? select.value : '', 48);
    var list = [];
    try { list = JSON.parse(form.getAttribute('data-product_variations') || '[]'); } catch (error) { list = []; }
    return { size: size, entry: list.find(function (candidate) { return candidate && candidate.attributes && candidate.attributes.attribute_pa_size === size; }) || null };
  }

  function syncPdp(form) {
    var selected = variation(form);
    var id = form.querySelector('.variation_id');
    if (id) id.value = selected.entry ? String(selected.entry.variation_id || '') : '0';
    form.querySelectorAll('[data-siini-size-option]').forEach(function (option) { option.setAttribute('aria-pressed', option.getAttribute('data-value') === selected.size ? 'true' : 'false'); });
    var hint = (form.closest('main') || document).querySelector('[data-siini-size-hint]');
    if (hint) hint.textContent = selected.size ? 'Размер ' + selected.size.replace('-', '.') + ' выбран.' : 'Выберите размер, чтобы добавить в корзину.';
  }

  function pdpProduct(form) {
    var selected = variation(form);
    var productId = clean(form.getAttribute('data-product_id') || ((form.querySelector('[name="product_id"]') || {}).value), 48);
    if (!productId || !selected.size || !selected.entry) return null;
    var root = form.closest('main') || document;
    var image = root.querySelector('.woocommerce-product-gallery img, .siini-product-gallery img');
    var listedPrice = root.querySelector('.siini-product-summary .woocommerce-Price-amount, .summary .woocommerce-Price-amount, .woocommerce-Price-amount');
    return {
      stableId: productId + ':' + clean(selected.entry.variation_id, 48),
      productId: productId,
      variationId: clean(selected.entry.variation_id, 48),
      size: selected.size.replace('-', '.'),
      title: (root.querySelector('h1') || {}).textContent || document.title,
      brand: '',
      price: amount(selected.entry.display_price) || price(listedPrice ? listedPrice.textContent : ''),
      image: (selected.entry.image && (selected.entry.image.thumb_src || selected.entry.image.src)) || (image ? image.getAttribute('src') : ''),
      url: window.location.pathname,
      quantity: (form.querySelector('[name="quantity"]') || {}).value || 1
    };
  }

  function setBadge(cart) {
    var quantity = pieces(cart);
    document.querySelectorAll('.wc-block-mini-cart__badge').forEach(function (node) {
      node.textContent = String(quantity);
      node.hidden = quantity === 0;
      node.removeAttribute('data-wp-bind--hidden');
      node.removeAttribute('data-wp-text');
    });
    document.querySelectorAll('.wc-block-mini-cart__button').forEach(function (node) { node.setAttribute('aria-label', 'Количество позиций в корзине: ' + quantity + '.'); });
  }

  function cell(className, label) {
    var node = document.createElement('td');
    node.className = className;
    if (label) node.setAttribute('data-title', label);
    return node;
  }

  function cartLink(url, label) {
    var node = document.createElement('a');
    node.href = url || '#';
    node.textContent = label;
    return node;
  }

  function renderCart(cart) {
    var form = document.querySelector('[data-siini-demo-cart-form]');
    if (!form || !cart.stored) return;
    var totals = document.querySelector('.cart-collaterals');
    if (!cart.items.length) {
      var empty = document.createElement('p');
      empty.className = 'cart-empty woocommerce-info siini-static-cart-empty';
      empty.append('Демо-корзина пуста. ');
      empty.appendChild(cartLink('../shop/index.html', 'Перейти в каталог'));
      form.replaceWith(empty);
      if (totals) totals.hidden = true;
      return;
    }
    var replacement = document.createElement('form');
    replacement.className = 'woocommerce-cart-form'; replacement.action = '#'; replacement.dataset.staticPreview = '1'; replacement.dataset.siiniDemoCartForm = '1';
    var table = document.createElement('table'); table.className = 'shop_table shop_table_responsive cart woocommerce-cart-form__contents';
    var head = document.createElement('thead'); var headRow = document.createElement('tr');
    [['product-remove',''],['product-thumbnail','Фото'],['product-name','Товар'],['product-price','Цена'],['product-quantity','Количество'],['product-subtotal','Сумма']].forEach(function (header) { var node = document.createElement('th'); node.className = header[0]; node.textContent = header[1]; headRow.appendChild(node); });
    head.appendChild(headRow);
    var body = document.createElement('tbody');
    cart.items.forEach(function (entry) {
      var row = document.createElement('tr'); row.className = 'woocommerce-cart-form__cart-item cart_item';
      var removeCell = cell('product-remove'); var removeButton = document.createElement('button'); removeButton.type = 'button'; removeButton.className = 'remove'; removeButton.dataset.siiniDemoCartRemove = entry.stableId; removeButton.setAttribute('aria-label', 'Удалить товар ' + entry.title); removeButton.textContent = '×'; removeCell.appendChild(removeButton);
      var imageCell = cell('product-thumbnail'); var imageLink = cartLink(entry.url, '');
      if (entry.image) { var image = document.createElement('img'); image.src = entry.image; image.alt = entry.title; image.width = 300; image.height = 300; image.loading = 'lazy'; imageLink.appendChild(image); }
      imageCell.appendChild(imageLink);
      var nameCell = cell('product-name', 'Товар'); nameCell.appendChild(cartLink(entry.url, entry.title + (entry.size ? ' — ' + entry.size : '')));
      var priceCell = cell('product-price', 'Цена'); priceCell.textContent = rubles(entry.price);
      var quantityCell = cell('product-quantity', 'Количество'); var controls = document.createElement('div'); controls.className = 'quantity siini-static-cart-quantity';
      var minus = document.createElement('button'); minus.type = 'button'; minus.textContent = '−'; minus.dataset.siiniDemoCartDecrease = entry.stableId; minus.setAttribute('aria-label', 'Уменьшить количество');
      var input = document.createElement('input'); input.type = 'number'; input.min = '1'; input.max = String(MAX); input.step = '1'; input.value = String(entry.quantity); input.dataset.siiniDemoCartQuantity = entry.stableId; input.setAttribute('aria-label', 'Количество товара');
      var plus = document.createElement('button'); plus.type = 'button'; plus.textContent = '+'; plus.dataset.siiniDemoCartIncrease = entry.stableId; plus.setAttribute('aria-label', 'Увеличить количество');
      controls.append(minus, input, plus); quantityCell.appendChild(controls);
      var subtotalCell = cell('product-subtotal', 'Сумма'); subtotalCell.textContent = rubles(entry.price * entry.quantity);
      row.append(removeCell, imageCell, nameCell, priceCell, quantityCell, subtotalCell); body.appendChild(row);
    });
    table.append(head, body); replacement.appendChild(table); form.replaceWith(replacement);
    if (totals) { totals.hidden = false; totals.querySelectorAll('.cart-subtotal td, .order-total td').forEach(function (node) { node.textContent = rubles(total(cart)); }); }
  }

  function renderCheckout(cart) {
    var review = document.querySelector('[data-siini-demo-checkout-review]');
    if (!review || !cart.stored) return;
    var table = review.querySelector('table'); var body = table && table.querySelector('tbody'); var foot = table && table.querySelector('tfoot');
    if (!body || !foot) return;
    body.replaceChildren();
    if (!cart.items.length) { var empty = document.createElement('tr'); var emptyCell = document.createElement('td'); emptyCell.colSpan = 2; emptyCell.textContent = 'Демо-корзина пуста.'; empty.appendChild(emptyCell); body.appendChild(empty); }
    cart.items.forEach(function (entry) { var row = document.createElement('tr'); row.className = 'cart_item'; var name = cell('product-name'); name.textContent = entry.title + (entry.size ? ' — ' + entry.size : '') + ' × ' + entry.quantity; var sum = cell('product-total'); sum.textContent = rubles(entry.price * entry.quantity); row.append(name, sum); body.appendChild(row); });
    foot.querySelectorAll('.cart-subtotal td, .order-total td').forEach(function (node) { node.textContent = rubles(total(cart)); });
  }

  function render() {
    var cart = load();
    setBadge(cart);
    document.querySelectorAll('[data-siini-product-card]').forEach(function (card) { syncCard(card, cart); });
    renderCart(cart);
    renderCheckout(cart);
  }

  // Woo's captured cart listeners can stop a document-level delegated event.
  // Window capture always precedes them and only owns generated demo controls.
  window.addEventListener('click', handleCartControlClick, true);

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('a, button');
    if (!trigger) return;
    if (trigger.matches('[data-siini-favorite-toggle]')) { event.preventDefault(); event.stopImmediatePropagation(); favorite(trigger); return; }
    if (trigger.matches('[data-siini-card-size]')) { var card = trigger.closest('[data-siini-product-card]'); if (card) { event.preventDefault(); event.stopImmediatePropagation(); card.querySelectorAll('[data-siini-card-size]').forEach(function (node) { node.setAttribute('aria-pressed', node === trigger ? 'true' : 'false'); }); render(); } return; }
    if (trigger.matches('[data-siini-size-option]')) { var form = trigger.closest('[data-siini-size-picker]'); form = form && form.parentElement.querySelector('[data-siini-demo-cart-pdp]'); if (form) { event.preventDefault(); event.stopImmediatePropagation(); var select = form.querySelector('[name="attribute_pa_size"]'); if (select) select.value = trigger.getAttribute('data-value') || ''; syncPdp(form); } return; }
    if (trigger.matches('[data-siini-card-cta]')) { event.preventDefault(); event.stopImmediatePropagation(); var productCard = trigger.closest('[data-siini-product-card]'); var product = productCard && selectedCardProduct(productCard); if (product) add(product, 1); else notice('Сначала выберите размер.', false); return; }
    if (trigger.matches('.single_add_to_cart_button')) { event.preventDefault(); event.stopImmediatePropagation(); var productForm = trigger.closest('[data-siini-demo-cart-pdp]'); var pdp = productForm && pdpProduct(productForm); if (pdp) add(pdp, pdp.quantity); else notice('Сначала выберите размер.', false); return; }
    if (trigger.matches('[data-siini-card-qty-plus], [data-siini-card-qty-minus]')) { var relatedCard = trigger.closest('[data-siini-product-card]'); var related = relatedCard && selectedCardProduct(relatedCard); var saved = related && load().items.find(function (entry) { return entry.stableId === related.stableId; }); if (saved) { event.preventDefault(); event.stopImmediatePropagation(); setQuantity(saved.stableId, saved.quantity + (trigger.matches('[data-siini-card-qty-plus]') ? 1 : -1)); } return; }
    if (trigger.matches('[data-static-preview-action], .place-order button, #place_order')) { event.preventDefault(); event.stopImmediatePropagation(); notice(DEFAULT_NOTICE, false); return; }
    if (trigger.tagName === 'A' && (blockUrl(trigger.getAttribute('href')) || trigger.getAttribute('href') === '#')) { event.preventDefault(); event.stopImmediatePropagation(); notice(DEFAULT_NOTICE, false); }
  }, true);

  document.addEventListener('change', function (event) {
    var input = event.target;
    if (input.matches('[data-siini-demo-cart-quantity]')) { setQuantity(input.dataset.siiniDemoCartQuantity, input.value); return; }
    if (input.matches('[data-siini-demo-cart-pdp] [name="attribute_pa_size"]')) syncPdp(input.closest('[data-siini-demo-cart-pdp]'));
  }, true);

  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (form.matches('.siini-product-search__form')) { var input = form.querySelector('[name="s"]'); if (input && input.value.trim()) { event.preventDefault(); event.stopImmediatePropagation(); var target = new URL(form.action || window.location.href, window.location.href); target.searchParams.set('s', input.value.trim()); window.location.assign(target.href); } return; }
    if (form.matches('[data-siini-demo-cart-pdp]')) { event.preventDefault(); event.stopImmediatePropagation(); var product = pdpProduct(form); if (product) add(product, product.quantity); else notice('Сначала выберите размер.', false); return; }
    if (form.dataset.staticPreview || blockUrl(form.getAttribute('action'))) { event.preventDefault(); event.stopImmediatePropagation(); notice(DEFAULT_NOTICE, false); }
  }, true);

  document.querySelectorAll('[data-siini-demo-cart-pdp]').forEach(syncPdp);
  render();
})();