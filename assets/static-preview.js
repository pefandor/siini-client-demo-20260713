(function () {
  'use strict';

  var KEY = 'siini.static-demo-cart.v1';
  var VIEWED_KEY = 'siini.static-demo-viewed.v1';
  var VERSION = 1;
  var MAX = 99;
  var RELATED_LIMIT = 4;
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
    var addButton = form.querySelector('.single_add_to_cart_button');
    var addWrap = form.querySelector('.woocommerce-variation-add-to-cart');
    var purchase = form.closest('.siini-product-summary-purchase');
    var picker = purchase && purchase.querySelector('[data-siini-size-picker]');
    var canBuy = !!selected.entry &&
      selected.entry.is_purchasable !== false &&
      selected.entry.is_in_stock !== false &&
      selected.entry.variation_is_active !== false &&
      selected.entry.variation_is_visible !== false;
    if (id) id.value = selected.entry ? String(selected.entry.variation_id || '') : '0';
    if (addButton) {
      addButton.disabled = !canBuy;
      addButton.classList.toggle('disabled', !canBuy);
      addButton.classList.toggle('wc-variation-selection-needed', !canBuy);
      addButton.setAttribute('aria-disabled', canBuy ? 'false' : 'true');
    }
    if (addWrap) {
      addWrap.classList.toggle('woocommerce-variation-add-to-cart-enabled', canBuy);
      addWrap.classList.toggle('woocommerce-variation-add-to-cart-disabled', !canBuy);
    }
    (picker || form).querySelectorAll('[data-siini-size-option]').forEach(function (option) {
      var active = option.getAttribute('data-value') === selected.size;
      option.classList.toggle('is-active', active);
      var pressed = active ? 'true' : 'false';
      if (option.getAttribute('aria-pressed') !== pressed) option.setAttribute('aria-pressed', pressed);
    });
    var hint = (form.closest('main') || document).querySelector('[data-siini-size-hint]');
    if (hint) {
      hint.textContent = selected.size ? '' : 'Выберите размер, чтобы добавить в корзину.';
      hint.hidden = !!selected.size;
    }
  }

  function selectPdpSize(form, value) {
    var select = form.querySelector('[name="attribute_pa_size"]');
    if (!select || !value) return;
    var version = String((Number(form.dataset.siiniStaticSizeVersion || '0') || 0) + 1);
    form.dataset.siiniStaticSizeVersion = version;
    function apply() {
      if (!form.isConnected || form.dataset.siiniStaticSizeVersion !== version) return;
      select.value = value;
      syncPdp(form);
    }
    apply();
    // Captured Woo/theme listeners can clear the native select after the
    // click.  Re-apply once their synchronous task has completed.
    window.setTimeout(apply, 0);
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(apply);
    });
  }

  function guardPdpSizeState(form) {
    var purchase = form.closest('.siini-product-summary-purchase');
    var picker = purchase && purchase.querySelector('[data-siini-size-picker]');
    if (!picker || form.dataset.siiniStaticSizeGuard === '1') return;
    form.dataset.siiniStaticSizeGuard = '1';
    var queued = false;
    new MutationObserver(function () {
      if (queued) return;
      queued = true;
      Promise.resolve().then(function () {
        queued = false;
        if (form.isConnected && variation(form).size) syncPdp(form);
      });
    }).observe(picker, { attributes: true, attributeFilter: ['class', 'aria-pressed'], subtree: true });
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

  function viewedItem(value) {
    if (!value || typeof value !== 'object') return null;
    var id = clean(value.id, 48);
    var title = clean(value.title, 240);
    var url = localUrl(value.url);
    if (!id || !title || !url) return null;
    return {
      id: id,
      title: title,
      brand: clean(value.brand, 120),
      price: amount(value.price),
      image: localUrl(value.image),
      url: url
    };
  }

  function loadViewed() {
    try {
      var raw = JSON.parse(window.localStorage.getItem(VIEWED_KEY) || '[]');
      var ids = {};
      return Array.isArray(raw) ? raw.map(viewedItem).filter(function (entry) {
        if (!entry || ids[entry.id]) return false;
        ids[entry.id] = true;
        return true;
      }) : [];
    } catch (error) {
      return [];
    }
  }

  function saveViewed(items) {
    try { window.localStorage.setItem(VIEWED_KEY, JSON.stringify(items.slice(0, 12))); } catch (error) {}
  }

  function currentViewedProduct(section) {
    var form = document.querySelector('[data-siini-demo-cart-pdp]');
    var id = clean(section.getAttribute('data-current-product-id') || (form && form.getAttribute('data-product_id')), 48);
    var root = document.querySelector('main') || document;
    var brandNode = Array.prototype.slice.call(root.querySelectorAll('.siini-product-description-details div')).find(function (row) {
      var term = row.querySelector('dt');
      return term && clean(term.textContent, 80).toLocaleLowerCase() === 'бренд';
    });
    var image = root.querySelector('.woocommerce-product-gallery img, .siini-product-gallery img');
    var priceNode = root.querySelector('.siini-product-summary .woocommerce-Price-amount, .summary .woocommerce-Price-amount, .woocommerce-Price-amount');
    return viewedItem({
      id: id,
      title: (root.querySelector('h1') || {}).textContent || document.title,
      brand: brandNode && (brandNode.querySelector('dd') || {}).textContent,
      price: price(priceNode ? priceNode.textContent : ''),
      image: image ? image.getAttribute('src') : '',
      url: window.location.pathname
    });
  }

  function fallbackProducts(section) {
    try {
      var raw = JSON.parse(section.getAttribute('data-siini-static-recommendations') || '[]');
      return Array.isArray(raw) ? raw.map(viewedItem).filter(Boolean) : [];
    } catch (error) {
      return [];
    }
  }

  function shuffled(items) {
    return items.slice().sort(function () { return Math.random() - 0.5; });
  }

  function relatedCard(entry, source) {
    var card = document.createElement('article');
    card.className = 'siini-home-product-card siini-home-product-card--related';
    card.dataset.siiniStaticRecommendation = source;
    var media = document.createElement('a');
    media.className = 'siini-home-product-card__media';
    media.href = entry.url;
    media.setAttribute('aria-label', 'Открыть товар ' + entry.title);
    if (entry.image) {
      var image = document.createElement('img');
      image.className = 'siini-home-product-card__image';
      image.src = entry.image;
      image.alt = entry.title;
      image.loading = 'lazy';
      media.appendChild(image);
    }
    var body = document.createElement('div');
    body.className = 'siini-home-product-card__body';
    if (entry.brand) {
      var brand = document.createElement('p');
      brand.className = 'siini-home-product-card__brand';
      brand.textContent = entry.brand;
      body.appendChild(brand);
    }
    var title = document.createElement('h3');
    var titleLink = document.createElement('a');
    titleLink.href = entry.url;
    titleLink.textContent = entry.title;
    title.appendChild(titleLink);
    var priceNode = document.createElement('div');
    priceNode.className = 'siini-home-product-card__price';
    priceNode.textContent = entry.price ? rubles(entry.price) : '';
    body.append(title, priceNode);
    card.append(media, body);
    return card;
  }

  function renderRecentlyViewed() {
    document.querySelectorAll('[data-siini-recently-viewed]').forEach(function (section) {
      var current = currentViewedProduct(section);
      if (!current) return;
      var previous = loadViewed();
      var picked = previous.filter(function (entry) { return entry.id !== current.id; }).slice(0, RELATED_LIMIT);
      var used = {};
      used[current.id] = true;
      picked.forEach(function (entry) { used[entry.id] = true; });
      shuffled(fallbackProducts(section)).some(function (entry) {
        if (picked.length >= RELATED_LIMIT) return true;
        if (!used[entry.id]) { picked.push(entry); used[entry.id] = true; }
        return false;
      });
      var grid = section.querySelector('[data-siini-recently-viewed-grid]');
      if (grid && picked.length) {
        grid.replaceChildren();
        picked.forEach(function (entry, index) {
          grid.appendChild(relatedCard(entry, index < previous.filter(function (item) { return item.id !== current.id; }).length ? 'history' : 'fallback'));
        });
        section.hidden = false;
      }
      saveViewed([current].concat(previous.filter(function (entry) { return entry.id !== current.id; })));
    });
  }

  function initStaticMobileSections() {
    var query = window.matchMedia && window.matchMedia('(max-width: 900px)');
    function syncOuterMenu() {
      document.querySelectorAll('[data-siini-mobile-menu]').forEach(function (menu) {
        var summary = menu.querySelector(':scope > summary');
        if (query && query.matches) {
          menu.style.setProperty('display', 'block', 'important');
          if (summary) summary.style.setProperty('display', 'flex', 'important');
        } else {
          menu.style.removeProperty('display');
          if (summary) summary.style.removeProperty('display');
        }
      });
    }
    syncOuterMenu();
    if (query && query.addEventListener) query.addEventListener('change', syncOuterMenu);
    document.querySelectorAll('[data-siini-mobile-section]').forEach(function (section) {
      var summary = section.querySelector(':scope > summary');
      if (!summary) return;
      function sync() { summary.setAttribute('aria-expanded', section.open ? 'true' : 'false'); }
      sync();
      summary.addEventListener('click', function (event) {
        if (!query || !query.matches) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        section.open = !section.open;
        sync();
      }, true);
    });
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
  window.addEventListener('pointerdown', function (event) {
    var option = event.target.closest('[data-siini-size-option]');
    if (!option) return;
    var picker = option.closest('[data-siini-size-picker]');
    var form = picker && picker.parentElement.querySelector('[data-siini-demo-cart-pdp]');
    if (form) selectPdpSize(form, option.getAttribute('data-value') || '');
  }, true);
  window.addEventListener('focusin', function (event) {
    var option = event.target.closest && event.target.closest('[data-siini-size-option]');
    if (!option) return;
    var picker = option.closest('[data-siini-size-picker]');
    var form = picker && picker.parentElement.querySelector('[data-siini-demo-cart-pdp]');
    if (form) selectPdpSize(form, option.getAttribute('data-value') || '');
  }, true);
  window.addEventListener('click', function (event) {
    var option = event.target.closest('[data-siini-size-option]');
    if (!option) return;
    var picker = option.closest('[data-siini-size-picker]');
    var form = picker && picker.parentElement.querySelector('[data-siini-demo-cart-pdp]');
    if (!form) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    selectPdpSize(form, option.getAttribute('data-value') || '');
  }, true);

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('a, button');
    if (!trigger) return;
    if (trigger.matches('[data-siini-favorite-toggle]')) { event.preventDefault(); event.stopImmediatePropagation(); favorite(trigger); return; }
    if (trigger.matches('[data-siini-card-size]')) { var card = trigger.closest('[data-siini-product-card]'); if (card) { event.preventDefault(); event.stopImmediatePropagation(); card.querySelectorAll('[data-siini-card-size]').forEach(function (node) { node.setAttribute('aria-pressed', node === trigger ? 'true' : 'false'); }); render(); } return; }
    if (trigger.matches('[data-siini-size-option]')) { var form = trigger.closest('[data-siini-size-picker]'); form = form && form.parentElement.querySelector('[data-siini-demo-cart-pdp]'); if (form) { event.preventDefault(); event.stopImmediatePropagation(); selectPdpSize(form, trigger.getAttribute('data-value') || ''); } return; }
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

  document.querySelectorAll('[data-siini-demo-cart-pdp]').forEach(function (form) {
    syncPdp(form);
    guardPdpSizeState(form);
  });
  initStaticMobileSections();
  renderRecentlyViewed();
  // The captured theme's empty-endpoint handler runs on DOMContentLoaded and
  // can hide this section after the static fallback has populated it.
  window.setTimeout(renderRecentlyViewed, 0);
  render();
})();