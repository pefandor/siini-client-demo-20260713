(function () {
	'use strict';

	function ready(callback) {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', callback);
			return;
		}

		callback();
	}

	ready(function () {
		var scrollers = Array.prototype.slice.call(document.querySelectorAll('[data-siini-new-scroller]'));
		var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		scrollers.forEach(function (scroller) {
			var originalCards = Array.prototype.slice.call(scroller.querySelectorAll('[data-siini-new-card]'));
			var cards = originalCards;
			var section = scroller.closest('[data-siini-home-new]');
			var prevButton = section ? section.querySelector('[data-siini-new-prev]') : null;
			var nextButton = section ? section.querySelector('[data-siini-new-next]') : null;
			var carousel = scroller.closest('.siini-home-new-carousel');
			var originalCount = originalCards.length;
			var firstOriginalIndex = originalCount;
			var lastOriginalIndex = (originalCount * 2) - 1;
			var frame = 0;
			var currentIndex = firstOriginalIndex;
			var dragStartX = 0;
			var dragStartScrollLeft = 0;
			var dragPointerId = null;
			var hasPointerCapture = false;
			var isDragging = false;
			var isProgrammaticScroll = false;
			var didDrag = false;
			var snapTimer = 0;
			var programmaticTimer = 0;
			var suppressClickUntil = 0;
			var dragSensitivity = 0.62;
			var wheelSensitivity = 0.58;
			var normalizeDelay = 260;
			var normalizeTimer = 0;

			function setupLoop() {
				var beforeFragment;
				var afterFragment;

				if (originalCount < 2 || scroller.getAttribute('data-siini-new-loop-ready') === 'true') {
					return;
				}

				beforeFragment = document.createDocumentFragment();
				afterFragment = document.createDocumentFragment();

				originalCards.forEach(function (card) {
					var beforeClone = card.cloneNode(true);
					var afterClone = card.cloneNode(true);

					beforeClone.setAttribute('data-siini-new-clone', 'before');
					afterClone.setAttribute('data-siini-new-clone', 'after');
					beforeFragment.appendChild(beforeClone);
					afterFragment.appendChild(afterClone);
				});

				scroller.insertBefore(beforeFragment, originalCards[0]);
				scroller.appendChild(afterFragment);
				scroller.setAttribute('data-siini-new-loop-ready', 'true');
				cards = Array.prototype.slice.call(scroller.querySelectorAll('[data-siini-new-card]'));
			}

			function gapSize() {
				var styles = window.getComputedStyle ? window.getComputedStyle(scroller) : null;
				var rawGap = styles ? (styles.columnGap || styles.gap || '0') : '0';

				return parseFloat(rawGap) || 0;
			}

			function layoutInfo() {
				var firstCard = cards[0];
				var gap = gapSize();
				var viewportWidth = scroller.clientWidth;
				var cardWidth = firstCard ? firstCard.getBoundingClientRect().width : 0;
				var fullCards = cardWidth ? Math.max(1, Math.floor((viewportWidth + gap) / (cardWidth + gap))) : 1;
				var sidePeek = Math.max(0, (viewportWidth - (fullCards * cardWidth) - ((fullCards + 1) * gap)) / 2);

				scroller.style.setProperty('--siini-new-snap-padding', Math.max(0, Math.round(gap + sidePeek)) + 'px');

				return {
					cardWidth: cardWidth,
					fullCards: fullCards,
					gap: gap,
					maxScroll: Math.max(0, scroller.scrollWidth - scroller.clientWidth),
					sidePeek: sidePeek,
				};
			}

			function canScroll() {
				return scroller.scrollWidth > scroller.clientWidth + 2;
			}

			function scrollTargets() {
				var info = layoutInfo();

				return cards.map(function (card, index) {
					if (index === 0) {
						return 0;
					}

					return Math.max(0, Math.min(info.maxScroll, card.offsetLeft - info.gap - info.sidePeek));
				});
			}

			function clampScroll(left) {
				var info = layoutInfo();

				return Math.max(0, Math.min(info.maxScroll, left));
			}

			function nearestIndex(targets) {
				var nearest = 0;
				var nearestDistance = Infinity;

				targets.forEach(function (target, index) {
					var distance = Math.abs(scroller.scrollLeft - target);

					if (distance < nearestDistance) {
						nearest = index;
						nearestDistance = distance;
					}
				});

				return nearest;
			}

			function normalizeLoopIndex(index) {
				if (originalCount < 2) {
					return index;
				}

				if (index < firstOriginalIndex) {
					return index + originalCount;
				}

				if (index > lastOriginalIndex) {
					return index - originalCount;
				}

				return index;
			}

			function normalizeLoopPosition() {
				var targets = scrollTargets();
				var normalizedIndex;

				if (!targets.length || originalCount < 2) {
					return;
				}

				currentIndex = nearestIndex(targets);
				normalizedIndex = normalizeLoopIndex(currentIndex);

				if (normalizedIndex === currentIndex || !targets[normalizedIndex]) {
					return;
				}

				currentIndex = normalizedIndex;
				markProgrammaticScroll();
				scroller.scrollTo({
					behavior: 'auto',
					left: targets[currentIndex],
				});
				updateButtons();
			}

			function scheduleNormalize() {
				window.clearTimeout(normalizeTimer);
				normalizeTimer = window.setTimeout(normalizeLoopPosition, prefersReducedMotion ? 90 : normalizeDelay);
			}

			function updateButtons() {
				var hasOverflow = canScroll();
				var targets = scrollTargets();

				currentIndex = nearestIndex(targets);

				if (prevButton) {
					prevButton.disabled = !hasOverflow;
				}

				if (nextButton) {
					nextButton.disabled = !hasOverflow;
				}

				if (carousel) {
					carousel.classList.toggle('is-at-start', !hasOverflow);
					carousel.classList.toggle('is-at-end', !hasOverflow);
				}
			}

			function scheduleUpdate() {
				if (frame) {
					return;
				}

				frame = window.requestAnimationFrame(function () {
					frame = 0;
					updateButtons();
				});
			}

			function markProgrammaticScroll() {
				isProgrammaticScroll = true;
				window.clearTimeout(programmaticTimer);
				programmaticTimer = window.setTimeout(function () {
					isProgrammaticScroll = false;
				}, prefersReducedMotion ? 80 : 520);
			}

			function snapToNearest(behavior) {
				var targets = scrollTargets();
				var targetIndex;

				if (!targets.length || !canScroll()) {
					return;
				}

				targetIndex = nearestIndex(targets);
				currentIndex = Math.max(0, Math.min(targets.length - 1, targetIndex));
				markProgrammaticScroll();
				scroller.scrollTo({
					behavior: prefersReducedMotion ? 'auto' : behavior,
					left: targets[currentIndex],
				});
				scheduleNormalize();
			}

			function scheduleSnap(delay) {
				window.clearTimeout(snapTimer);
				snapTimer = window.setTimeout(function () {
					snapToNearest('smooth');
				}, delay);
			}

			function move(direction) {
				var targets = scrollTargets();
				var targetIndex;

				if (!targets.length || !canScroll()) {
					return;
				}

				currentIndex = normalizeLoopIndex(nearestIndex(targets));
				targetIndex = currentIndex + (direction > 0 ? 1 : -1);

				if (targetIndex < 0) {
					targetIndex = targets.length - 1;
				} else if (targetIndex > targets.length - 1) {
					targetIndex = 0;
				}

				currentIndex = Math.max(0, Math.min(targets.length - 1, targetIndex));
				markProgrammaticScroll();
				scroller.scrollTo({
					behavior: prefersReducedMotion ? 'auto' : 'smooth',
					left: targets[currentIndex],
				});
				scheduleNormalize();
			}

			if (prevButton) {
				prevButton.addEventListener('click', function () {
					move(-1);
				});
			}

			if (nextButton) {
				nextButton.addEventListener('click', function () {
					move(1);
				});
			}

			function endDrag() {
				if (!isDragging) {
					return;
				}

				isDragging = false;
				dragPointerId = null;
				hasPointerCapture = false;
				scroller.classList.remove('is-pointer-down');
				scroller.classList.remove('is-dragging');

				if (didDrag) {
					suppressClickUntil = Date.now() + 350;
					scheduleNormalize();
				}

				window.setTimeout(function () {
					didDrag = false;
				}, 360);
			}

			scroller.addEventListener('pointerdown', function (event) {
				if (!canScroll() || (event.pointerType === 'mouse' && event.button !== 0)) {
					return;
				}

				isDragging = true;
				didDrag = false;
				dragPointerId = event.pointerId;
				hasPointerCapture = false;
				dragStartX = event.clientX;
				dragStartScrollLeft = scroller.scrollLeft;
				scroller.classList.add('is-pointer-down');
			});

			scroller.addEventListener('pointermove', function (event) {
				if (!isDragging || (dragPointerId !== null && event.pointerId !== dragPointerId)) {
					return;
				}

				var deltaX = event.clientX - dragStartX;
				if (Math.abs(deltaX) > 4) {
					didDrag = true;
					scroller.classList.add('is-dragging');
					if (!hasPointerCapture && scroller.setPointerCapture) {
						try {
							scroller.setPointerCapture(event.pointerId);
							hasPointerCapture = true;
						} catch (error) {
							// Pointer capture is a progressive enhancement for smoother drag.
						}
					}
				}

				if (didDrag) {
					event.preventDefault();
					window.clearTimeout(snapTimer);
					scroller.scrollLeft = clampScroll(dragStartScrollLeft - (deltaX * dragSensitivity));
				}
			});

			scroller.addEventListener('pointerup', endDrag);
			scroller.addEventListener('pointercancel', endDrag);
			scroller.addEventListener('lostpointercapture', endDrag);
			scroller.addEventListener('dragstart', function (event) {
				event.preventDefault();
			});
			scroller.addEventListener('click', function (event) {
				if (!didDrag && Date.now() > suppressClickUntil) {
					return;
				}

				event.preventDefault();
				event.stopImmediatePropagation();
			}, true);
			scroller.addEventListener('wheel', function (event) {
				var horizontalDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) * 0.55 ? event.deltaX : 0;
				var unit = event.deltaMode === 1 ? 16 : (event.deltaMode === 2 ? scroller.clientWidth : 1);

				if (!horizontalDelta || !canScroll()) {
					return;
				}

				event.preventDefault();
				window.clearTimeout(snapTimer);
				scroller.scrollLeft = clampScroll(scroller.scrollLeft + (horizontalDelta * unit * wheelSensitivity));
				scheduleNormalize();
			}, { passive: false });
			scroller.addEventListener('scroll', function () {
				scheduleUpdate();
				if (!isDragging && !isProgrammaticScroll) {
					scheduleNormalize();
				}
			}, { passive: true });
			window.addEventListener('resize', function () {
				window.setTimeout(function () {
					var targets = scrollTargets();
					currentIndex = normalizeLoopIndex(currentIndex);
					markProgrammaticScroll();
					scroller.scrollTo({
						behavior: 'auto',
						left: targets[Math.max(0, Math.min(targets.length - 1, currentIndex))],
					});
					updateButtons();
				}, 120);
			}, { passive: true });

			setupLoop();
			(function () {
				var targets = scrollTargets();

				if (targets[firstOriginalIndex]) {
					markProgrammaticScroll();
					scroller.scrollTo({
						behavior: 'auto',
						left: targets[firstOriginalIndex],
					});
					currentIndex = firstOriginalIndex;
				}

				updateButtons();
			}());
			updateButtons();
			window.setTimeout(updateButtons, 250);
		});
	});
}());

(function () {
	'use strict';

	var STORAGE_KEY = 'siini_favorites_v1';

	function ready(callback) {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', callback);
			return;
		}

		callback();
	}

	function readFavorites() {
		try {
			var raw = window.localStorage.getItem(STORAGE_KEY);
			var parsed = raw ? JSON.parse(raw) : [];
			var list = Array.isArray(parsed) ? parsed : Object.keys(parsed || {}).map(function (key) {
				return parsed[key];
			});
			var map = {};

			list.forEach(function (item) {
				if (item && item.productId) {
					map[String(item.productId)] = item;
				}
			});

			return map;
		} catch (error) {
			return {};
		}
	}

	function writeFavorites(map) {
		var list = Object.keys(map).map(function (key) {
			return map[key];
		}).sort(function (a, b) {
			return (b.timestamp || 0) - (a.timestamp || 0);
		});

		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
		} catch (error) {}

		return list;
	}

	function cardFromToggle(toggle) {
		return toggle ? toggle.closest('[data-siini-product-card]') : null;
	}

	function productId(card) {
		return card ? String(card.getAttribute('data-product-id') || '') : '';
	}

	function fallbackCopyText(value) {
		var textarea;

		textarea = document.createElement('textarea');
		textarea.value = value;
		textarea.setAttribute('readonly', 'readonly');
		textarea.style.position = 'fixed';
		textarea.style.left = '-9999px';
		document.body.appendChild(textarea);
		textarea.select();

		try {
			document.execCommand('copy');
		} catch (error) {}

		document.body.removeChild(textarea);

		return Promise.resolve();
	}

	function copyText(value) {
		if (window.navigator.clipboard && window.navigator.clipboard.writeText) {
			return window.navigator.clipboard.writeText(value).catch(function () {
				return fallbackCopyText(value);
			});
		}

		return fallbackCopyText(value);
	}

	function markCopied(button) {
		var originalLabel = button.getAttribute('aria-label') || 'Скопировать ссылку';

		button.classList.add('is-copied');
		button.setAttribute('aria-label', 'Ссылка скопирована');
		button.setAttribute('title', 'Ссылка скопирована');

		window.setTimeout(function () {
			button.classList.remove('is-copied');
			button.setAttribute('aria-label', originalLabel);
			button.removeAttribute('title');
		}, 1400);
	}

	function collectFavorite(card) {
		var titleNode = card.querySelector('h3 a');
		var imageNode = card.querySelector('.siini-home-product-card__image');
		var currentPriceNode = card.querySelector('[data-siini-card-current-price]');
		var oldPriceNode = card.querySelector('[data-siini-card-old-price]');
		var id = productId(card);

		return {
			productId: id,
			title: card.getAttribute('data-siini-favorite-title') || (titleNode ? titleNode.textContent.trim() : ''),
			brand: card.getAttribute('data-siini-favorite-brand') || '',
			priceText: card.getAttribute('data-siini-favorite-price') || (currentPriceNode ? currentPriceNode.textContent.trim() : ''),
			oldPriceText: card.getAttribute('data-siini-favorite-old-price') || (oldPriceNode ? oldPriceNode.textContent.trim() : ''),
			permalink: card.getAttribute('data-siini-favorite-url') || (titleNode ? titleNode.href : ''),
			imageSrc: card.getAttribute('data-siini-favorite-image') || (imageNode ? imageNode.currentSrc || imageNode.src : ''),
			timestamp: Date.now(),
		};
	}

	function setToggleState(button, active) {
		button.classList.toggle('is-active', active);
		button.setAttribute('aria-pressed', active ? 'true' : 'false');
		button.setAttribute('aria-label', active ? 'Убрать из избранного' : 'Добавить в избранное');
		button.textContent = active ? '♥' : '♡';
	}

	function updateCounters(count) {
		Array.prototype.slice.call(document.querySelectorAll('[data-siini-favorites-count]')).forEach(function (node) {
			node.textContent = String(count);
			node.hidden = count <= 0;
		});
	}

	function clearNode(node) {
		while (node.firstChild) {
			node.removeChild(node.firstChild);
		}
	}

	function appendText(parent, tag, className, text) {
		var node = document.createElement(tag);
		node.className = className;
		node.textContent = text || '';
		parent.appendChild(node);
		return node;
	}

	function renderDrawer(list) {
		var content = document.querySelector('[data-siini-favorites-content]');

		if (!content) {
			return;
		}

		clearNode(content);

		if (!list.length) {
			var empty = document.createElement('div');
			var link = document.createElement('a');

			empty.className = 'siini-favorites-drawer__empty';
			appendText(empty, 'p', 'siini-favorites-drawer__empty-text', 'В избранном пока пусто');
			link.className = 'siini-favorites-drawer__catalog';
			link.href = '/shop/';
			link.textContent = 'В каталог';
			empty.appendChild(link);
			content.appendChild(empty);
			return;
		}

		list.forEach(function (item) {
			var row = document.createElement('article');
			var media = document.createElement('a');
			var image = document.createElement('img');
			var body = document.createElement('div');
			var title = document.createElement('a');
			var price = document.createElement('p');
			var open = document.createElement('a');
			var remove = document.createElement('button');

			row.className = 'siini-favorites-drawer__item';
			media.className = 'siini-favorites-drawer__media';
			media.href = item.permalink || '/shop/';
			image.alt = item.title || '';
			image.loading = 'lazy';
			image.src = item.imageSrc || '';
			media.appendChild(image);

			body.className = 'siini-favorites-drawer__body';
			appendText(body, 'p', 'siini-favorites-drawer__brand', item.brand || 'SINI');
			title.className = 'siini-favorites-drawer__title';
			title.href = item.permalink || '/shop/';
			title.textContent = item.title || 'Товар';
			body.appendChild(title);

			price.className = 'siini-favorites-drawer__price';
			appendText(price, 'span', 'siini-favorites-drawer__price-current', item.priceText || '');
			if (item.oldPriceText) {
				appendText(price, 'del', 'siini-favorites-drawer__price-old', item.oldPriceText);
			}
			body.appendChild(price);

			open.className = 'siini-favorites-drawer__open';
			open.href = item.permalink || '/shop/';
			open.textContent = 'Открыть товар';
			body.appendChild(open);

			remove.className = 'siini-favorites-drawer__remove';
			remove.type = 'button';
			remove.setAttribute('aria-label', 'Убрать из избранного');
			remove.setAttribute('data-siini-favorite-remove', item.productId);
			remove.textContent = '♥';

			row.appendChild(media);
			row.appendChild(body);
			row.appendChild(remove);
			content.appendChild(row);
		});
	}

	function ensureDrawerInBody() {
		var drawer = document.querySelector('[data-siini-favorites-drawer]');

		if (drawer && drawer.parentNode !== document.body) {
			document.body.appendChild(drawer);
		}
	}

	function syncFavorites() {
		ensureDrawerInBody();

		var map = readFavorites();
		var list = Object.keys(map).map(function (key) {
			return map[key];
		}).sort(function (a, b) {
			return (b.timestamp || 0) - (a.timestamp || 0);
		});

		Array.prototype.slice.call(document.querySelectorAll('[data-siini-favorite-toggle]')).forEach(function (button) {
			var id = productId(cardFromToggle(button));
			setToggleState(button, !!(id && map[id]));
		});

		updateCounters(list.length);
		renderDrawer(list);
	}

	function openDrawer() {
		ensureDrawerInBody();

		var drawer = document.querySelector('[data-siini-favorites-drawer]');
		var panel = drawer ? drawer.querySelector('.siini-favorites-drawer__panel') : null;

		if (!drawer) {
			return;
		}

		syncFavorites();
		drawer.hidden = false;
		document.documentElement.classList.add('siini-favorites-open');
		document.body.classList.add('siini-favorites-open');
		Array.prototype.slice.call(document.querySelectorAll('[data-siini-favorites-open]')).forEach(function (button) {
			button.setAttribute('aria-expanded', 'true');
		});

		if (panel) {
			panel.focus({ preventScroll: true });
		}
	}

	function closeDrawer() {
		ensureDrawerInBody();

		var drawer = document.querySelector('[data-siini-favorites-drawer]');

		if (drawer) {
			drawer.hidden = true;
		}

		document.documentElement.classList.remove('siini-favorites-open');
		document.body.classList.remove('siini-favorites-open');
		Array.prototype.slice.call(document.querySelectorAll('[data-siini-favorites-open]')).forEach(function (button) {
			button.setAttribute('aria-expanded', 'false');
		});
	}

	ready(function () {
		document.addEventListener('click', function (event) {
			var toggle = event.target.closest('[data-siini-favorite-toggle]');
			var copyLink = event.target.closest('[data-siini-card-copy-link]');
			var opener = event.target.closest('[data-siini-favorites-open]');
			var closer = event.target.closest('[data-siini-favorites-close]');
			var remove = event.target.closest('[data-siini-favorite-remove]');
			var map;
			var card;
			var id;

			if (copyLink) {
				event.preventDefault();
				event.stopPropagation();
				copyText(copyLink.getAttribute('data-copy-url') || window.location.href).then(function () {
					markCopied(copyLink);
				});
				return;
			}

			if (toggle) {
				event.preventDefault();
				event.stopPropagation();
				card = cardFromToggle(toggle);
				id = productId(card);
				if (!card || !id) {
					return;
				}
				map = readFavorites();
				if (map[id]) {
					delete map[id];
				} else {
					map[id] = collectFavorite(card);
				}
				writeFavorites(map);
				syncFavorites();
				return;
			}

			if (opener) {
				event.preventDefault();
				openDrawer();
				return;
			}

			if (closer) {
				event.preventDefault();
				closeDrawer();
				return;
			}

			if (remove) {
				event.preventDefault();
				map = readFavorites();
				delete map[String(remove.getAttribute('data-siini-favorite-remove') || '')];
				writeFavorites(map);
				syncFavorites();
			}
		});

		document.addEventListener('keydown', function (event) {
			if (event.key === 'Escape') {
				closeDrawer();
			}
		});

		window.addEventListener('storage', function (event) {
			if (event.key === STORAGE_KEY) {
				syncFavorites();
			}
		});

		syncFavorites();
	});
}());

(function () {
	'use strict';

	function ready(callback) {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', callback);
			return;
		}

		callback();
	}

	function config() {
		return window.siiniSite || {};
	}

	function cartUrl() {
		return config().cartUrl || '/cart/';
	}

	function endpoint() {
		return config().addToCartEndpoint || '/?wc-ajax=add_to_cart';
	}

	function setMessage(card, message, isError) {
		var node = card.querySelector('[data-siini-card-message]');

		if (!node) {
			return;
		}

		node.textContent = message || '';
		node.classList.toggle('is-error', !!isError);
		node.hidden = !message;
	}

	function selectedSize(card) {
		return card.querySelector('[data-siini-card-size].is-selected');
	}

	function updateCtaForSelection(card) {
		var cta = card.querySelector('[data-siini-card-cta]');
		var selected = selectedSize(card);

		if (!cta) {
			return;
		}

		if (selected) {
			cta.textContent = cta.getAttribute('data-add-text') || 'Добавить в корзину';
			cta.classList.add('is-ready');
			cta.setAttribute('aria-disabled', 'false');
			card.classList.add('has-selected-size');
			return;
		}

		cta.textContent = cta.getAttribute('data-default-text') || 'Выбрать размер';
		cta.classList.remove('is-ready');
		cta.setAttribute('aria-disabled', card.getAttribute('data-product-type') === 'variable' ? 'true' : 'false');
		card.classList.remove('has-selected-size');
	}

	function applyFragments(response) {
		if (!response || !response.fragments) {
			return;
		}

		Object.keys(response.fragments).forEach(function (selector) {
			var fragment = response.fragments[selector];
			var nodes = Array.prototype.slice.call(document.querySelectorAll(selector));

			nodes.forEach(function (node) {
				var wrapper = document.createElement('div');
				wrapper.innerHTML = fragment;
				if (wrapper.firstElementChild) {
					node.replaceWith(wrapper.firstElementChild);
				}
			});
		});
	}

	function dispatchCartEvents(response, cta) {
		if (window.jQuery) {
			window.jQuery(document.body).trigger('added_to_cart', [
				response && response.fragments ? response.fragments : {},
				response && response.cart_hash ? response.cart_hash : '',
				window.jQuery(cta),
			]);
		}

		document.body.dispatchEvent(new window.CustomEvent('wc-blocks_added_to_cart', {
			bubbles: true,
			detail: { preserveCartData: false },
		}));
	}

	function showAddedState(card) {
		var cta = card.querySelector('[data-siini-card-cta]');
		var added = card.querySelector('[data-siini-card-added]');
		var link = card.querySelector('[data-siini-card-added] a');
		var quantity = Math.max(0, parseInt(card.getAttribute('data-selected-quantity') || '0', 10) || 0) + 1;

		setCardQuantity(card, quantity);
		card.classList.add('is-added');
		Array.prototype.slice.call(card.querySelectorAll('.added_to_cart.wc-forward')).forEach(function (node) {
			node.remove();
		});

		if (link) {
			link.href = cartUrl();
		}

		if (cta) {
			cta.hidden = true;
			cta.classList.remove('is-loading');
		}

		if (added) {
			added.hidden = false;
		}
	}

	function setCardQuantity(card, quantity) {
		var safeQuantity = Math.max(1, parseInt(quantity, 10) || 1);
		var count = card.querySelector('[data-siini-card-added-count]');
		var minusButtons = Array.prototype.slice.call(card.querySelectorAll('[data-siini-card-qty-minus]'));

		card.setAttribute('data-selected-quantity', String(safeQuantity));

		if (count) {
			count.textContent = String(safeQuantity);
		}

		minusButtons.forEach(function (button) {
			button.disabled = safeQuantity <= 1;
			button.setAttribute('aria-disabled', safeQuantity <= 1 ? 'true' : 'false');
		});
	}

	function addToCart(card, cta, options) {
		var settings = options || {};
		var type = card.getAttribute('data-product-type') || cta.getAttribute('data-product-type') || '';
		var selected = selectedSize(card);
		var variationId = selected ? parseInt(selected.getAttribute('data-variation-id') || '0', 10) || 0 : 0;
		var productId = parseInt(card.getAttribute('data-product-id') || cta.getAttribute('data-product-id') || cta.getAttribute('data-product_id') || '0', 10) || 0;
		var requestProductId = type === 'variable' && variationId ? variationId : productId;
		var body = new window.URLSearchParams();

		if (type === 'variable' && !variationId) {
			setMessage(card, 'Сначала выберите размер.', true);
			return Promise.reject(new Error('missing-size'));
		}

		body.set('product_id', String(requestProductId));
		body.set('quantity', '1');

		if (variationId) {
			body.set('variation_id', String(variationId));
		}

		if (selected && selected.getAttribute('data-attribute-name')) {
			body.set(selected.getAttribute('data-attribute-name'), selected.getAttribute('data-attribute-value') || '');
		}

		cta.classList.add('is-loading');
		cta.setAttribute('aria-busy', 'true');
		card.classList.add('is-quantity-loading');
		setMessage(card, '', false);

		return window.fetch(endpoint(), {
			method: 'POST',
			credentials: 'same-origin',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
				'X-Requested-With': 'XMLHttpRequest',
			},
			body: body.toString(),
		}).then(function (response) {
			return response.json();
		}).then(function (response) {
			if (response && response.error) {
				throw new Error('add-to-cart-error');
			}

			applyFragments(response);
			dispatchCartEvents(response, cta);
			if (!settings.skipAddedState) {
				showAddedState(card);
			}
			setMessage(card, '', false);
			return response;
		}).catch(function (error) {
			if (error && error.message === 'missing-size') {
				throw error;
			}

			cta.classList.remove('is-loading');
			card.classList.remove('is-quantity-loading');
			if (settings.silentError) {
				setMessage(card, '', false);
				return null;
			}
			setMessage(card, (config().messages && config().messages.cartError) || 'Не получилось добавить. Попробуйте еще раз.', true);
			throw error;
		}).finally(function () {
			cta.removeAttribute('aria-busy');
			card.classList.remove('is-quantity-loading');
		});
	}

	function initCard(card) {
		var cta = card.querySelector('[data-siini-card-cta]');
		var sizes = Array.prototype.slice.call(card.querySelectorAll('[data-siini-card-size]'));

		sizes.forEach(function (button) {
			button.addEventListener('click', function (event) {
				event.preventDefault();
				event.stopPropagation();

				sizes.forEach(function (other) {
					other.classList.toggle('is-selected', other === button);
					other.setAttribute('aria-pressed', other === button ? 'true' : 'false');
				});

				card.classList.remove('is-added');
				card.setAttribute('data-selected-quantity', '0');
				if (cta) {
					cta.hidden = false;
				}
				Array.prototype.slice.call(card.querySelectorAll('[data-siini-card-added]')).forEach(function (node) {
					node.hidden = true;
				});
				setMessage(card, '', false);
				updateCtaForSelection(card);
			});
		});

		if (cta) {
			cta.addEventListener('click', function (event) {
				var type = card.getAttribute('data-product-type') || cta.getAttribute('data-product-type') || '';

				if (cta.classList.contains('is-loading')) {
					event.preventDefault();
					return;
				}

				if (type !== 'variable' && !cta.classList.contains('ajax_add_to_cart')) {
					return;
				}

				event.preventDefault();
				addToCart(card, cta).catch(function () {});
			});
		}

		Array.prototype.slice.call(card.querySelectorAll('[data-siini-card-qty-plus]')).forEach(function (button) {
			button.addEventListener('click', function (event) {
				var current = parseInt(card.getAttribute('data-selected-quantity') || '1', 10) || 1;

				event.preventDefault();
				event.stopPropagation();

				if (!card.classList.contains('is-added') || card.classList.contains('is-quantity-loading') || !cta) {
					return;
				}

				setCardQuantity(card, current + 1);
				addToCart(card, cta, {
					silentError: true,
					skipAddedState: true,
				}).catch(function () {});
			});
		});

		Array.prototype.slice.call(card.querySelectorAll('[data-siini-card-qty-minus]')).forEach(function (button) {
			button.addEventListener('click', function (event) {
				var current = parseInt(card.getAttribute('data-selected-quantity') || '1', 10) || 1;

				event.preventDefault();
				event.stopPropagation();

				if (!card.classList.contains('is-added')) {
					return;
				}

				if (current <= 1) {
					setCardQuantity(card, 1);
					return;
				}

				setCardQuantity(card, current - 1);
			});
		});

		updateCtaForSelection(card);
	}

	ready(function () {
		Array.prototype.slice.call(document.querySelectorAll('[data-siini-product-card]')).forEach(initCard);
	});
}());

(function () {
	'use strict';

	function ready(callback) {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', callback);
			return;
		}

		callback();
	}

	ready(function () {
		var modal = document.createElement('div');
		var dialog = document.createElement('div');
		var closeButton = document.createElement('button');
		var image = document.createElement('img');
		var previousActive = null;

		modal.className = 'siini-product-lightbox';
		modal.setAttribute('data-siini-product-lightbox', '');
		modal.setAttribute('role', 'presentation');
		modal.hidden = true;

		dialog.className = 'siini-product-lightbox__dialog';
		dialog.setAttribute('role', 'dialog');
		dialog.setAttribute('aria-modal', 'true');
		dialog.setAttribute('aria-label', 'Фото товара');

		closeButton.className = 'siini-product-lightbox__close';
		closeButton.type = 'button';
		closeButton.setAttribute('aria-label', 'Закрыть фото');
		closeButton.textContent = '×';

		image.className = 'siini-product-lightbox__image';
		image.alt = '';
		image.draggable = false;

		dialog.appendChild(closeButton);
		dialog.appendChild(image);
		modal.appendChild(dialog);
		document.body.appendChild(modal);

		function closeLightbox() {
			modal.hidden = true;
			image.removeAttribute('src');
			image.alt = '';
			document.documentElement.classList.remove('siini-lightbox-open');
			document.body.classList.remove('siini-lightbox-open');

			if (previousActive && typeof previousActive.focus === 'function') {
				previousActive.focus({ preventScroll: true });
			}
		}

		function openLightbox(trigger) {
			var src = trigger.getAttribute('data-siini-card-lightbox-src') || '';

			if (!src) {
				return;
			}

			previousActive = document.activeElement;
			image.src = src;
			image.alt = trigger.getAttribute('data-siini-card-lightbox-alt') || '';
			modal.hidden = false;
			document.documentElement.classList.add('siini-lightbox-open');
			document.body.classList.add('siini-lightbox-open');
			closeButton.focus({ preventScroll: true });
		}

		document.addEventListener('click', function (event) {
			var trigger = event.target.closest('[data-siini-card-lightbox]');

			if (!trigger) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();
			openLightbox(trigger);
		});

		closeButton.addEventListener('click', function () {
			closeLightbox();
		});

		modal.addEventListener('click', function (event) {
			if (event.target === modal) {
				closeLightbox();
			}
		});

		document.addEventListener('keydown', function (event) {
			if (event.key === 'Escape' && !modal.hidden) {
				closeLightbox();
			}
		});
	});
}());

(function () {
	'use strict';

	function ready(callback) {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', callback);
			return;
		}

		callback();
	}

	ready(function () {
		var mobileMenu = document.querySelector('.siini-mobile-menu');
		var copyButtons = Array.prototype.slice.call(document.querySelectorAll('[data-siini-copy-code]'));
		var newsletterDemo = document.querySelector('[data-siini-newsletter-demo]');

		if (mobileMenu) {
			mobileMenu.addEventListener('toggle', function () {
				document.documentElement.classList.toggle('siini-mobile-menu-open', mobileMenu.open);
			});

			Array.prototype.slice.call(mobileMenu.querySelectorAll('a')).forEach(function (link) {
				link.addEventListener('click', function () {
					mobileMenu.open = false;
				});
			});

			document.addEventListener('keydown', function (event) {
				if (event.key === 'Escape') {
					mobileMenu.open = false;
				}
			});
		}

		copyButtons.forEach(function (button) {
			button.addEventListener('click', function () {
				var code = button.getAttribute('data-siini-copy-code') || button.textContent || '';
				var initialText = button.textContent;

				function done() {
					button.textContent = 'Скопировано';
					window.setTimeout(function () {
						button.textContent = initialText;
					}, 1400);
				}

				if (navigator.clipboard && navigator.clipboard.writeText) {
					navigator.clipboard.writeText(code).then(done, done);
					return;
				}

				done();
			});
		});

		if (newsletterDemo) {
			newsletterDemo.addEventListener('submit', function (event) {
				var button = newsletterDemo.querySelector('button[type="submit"]');
				event.preventDefault();
				if (button) {
					button.textContent = '✓';
					window.setTimeout(function () {
						button.textContent = '→';
					}, 1400);
				}
			});
		}
	});
}());

(function () {
	'use strict';

	function ready(callback) {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', callback);
			return;
		}

		callback();
	}

	ready(function () {
		var sliders = Array.prototype.slice.call(document.querySelectorAll('[data-siini-hero-slider]'));
		var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		sliders.forEach(function (slider) {
			var slides = Array.prototype.slice.call(slider.querySelectorAll('[data-siini-hero-slide]'));
			var dots = Array.prototype.slice.call(slider.querySelectorAll('[data-siini-hero-dot]'));
			var prevButton = slider.querySelector('[data-siini-hero-prev]');
			var nextButton = slider.querySelector('[data-siini-hero-next]');
			var activeIndex = 0;
			var timer = 0;
			var paused = false;

			if (slides.length <= 1) {
				if (prevButton) {
					prevButton.disabled = true;
				}
				if (nextButton) {
					nextButton.disabled = true;
				}
				return;
			}

			function show(nextIndex) {
				activeIndex = (nextIndex + slides.length) % slides.length;

				slides.forEach(function (slide, index) {
					var isActive = index === activeIndex;
					slide.classList.toggle('is-active', isActive);
					slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
				});

				dots.forEach(function (dot, index) {
					var isActive = index === activeIndex;
					dot.classList.toggle('is-active', isActive);
					dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
				});
			}

			function stopTimer() {
				if (timer) {
					window.clearInterval(timer);
					timer = 0;
				}
			}

			function startTimer() {
				if (prefersReducedMotion || timer) {
					return;
				}

				timer = window.setInterval(function () {
					if (!paused) {
						show(activeIndex + 1);
					}
				}, 7200);
			}

			function manual(nextIndex) {
				stopTimer();
				show(nextIndex);
				window.setTimeout(startTimer, 9000);
			}

			if (prevButton) {
				prevButton.addEventListener('click', function () {
					manual(activeIndex - 1);
				});
			}

			if (nextButton) {
				nextButton.addEventListener('click', function () {
					manual(activeIndex + 1);
				});
			}

			dots.forEach(function (dot, index) {
				dot.addEventListener('click', function () {
					manual(index);
				});
			});

			slider.addEventListener('pointerenter', function () {
				paused = true;
			});

			slider.addEventListener('pointerleave', function () {
				paused = false;
			});

			slider.addEventListener('focusin', function () {
				paused = true;
			});

			slider.addEventListener('focusout', function () {
				paused = false;
			});

			show(0);
			startTimer();
		});
	});
}());

(function () {
	'use strict';

	function ready(callback) {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', callback);
			return;
		}

		callback();
	}

	ready(function () {
		var roots = Array.prototype.slice.call(document.querySelectorAll('[data-siini-review-carousel]'));
		var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		roots.forEach(function (root) {
			var slides = Array.prototype.slice.call(root.querySelectorAll('[data-siini-review-slide]'));
			var dots = Array.prototype.slice.call(root.querySelectorAll('[data-siini-review-dot]'));
			var prev = root.querySelector('[data-siini-review-prev]');
			var next = root.querySelector('[data-siini-review-next]');
			var activeIndex = 0;
			var timer = 0;
			var paused = false;

			if (slides.length <= 1) {
				if (prev) {
					prev.disabled = true;
				}
				if (next) {
					next.disabled = true;
				}
				return;
			}

			function show(index) {
				activeIndex = (index + slides.length) % slides.length;

				slides.forEach(function (slide, slideIndex) {
					var isActive = slideIndex === activeIndex;
					var isPrev = slideIndex === (activeIndex - 1 + slides.length) % slides.length;
					var isNext = slideIndex === (activeIndex + 1) % slides.length;
					var isPrevTwo = slideIndex === (activeIndex - 2 + slides.length) % slides.length;
					var isNextTwo = slideIndex === (activeIndex + 2) % slides.length;

					slide.classList.toggle('is-active', isActive);
					slide.classList.toggle('is-prev', isPrev);
					slide.classList.toggle('is-next', isNext);
					slide.classList.toggle('is-prev-two', isPrevTwo);
					slide.classList.toggle('is-next-two', isNextTwo);
					slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
				});

				dots.forEach(function (dot, dotIndex) {
					var isActive = dotIndex === activeIndex;
					dot.classList.toggle('is-active', isActive);
					dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
				});
			}

			function stopTimer() {
				if (timer) {
					window.clearInterval(timer);
					timer = 0;
				}
			}

			function startTimer() {
				if (prefersReducedMotion || timer) {
					return;
				}

				timer = window.setInterval(function () {
					if (!paused) {
						show(activeIndex + 1);
					}
				}, 6200);
			}

			function manual(index) {
				stopTimer();
				show(index);
				window.setTimeout(startTimer, 8000);
			}

			if (prev) {
				prev.addEventListener('click', function () {
					manual(activeIndex - 1);
				});
			}

			if (next) {
				next.addEventListener('click', function () {
					manual(activeIndex + 1);
				});
			}

			dots.forEach(function (dot, dotIndex) {
				dot.addEventListener('click', function () {
					manual(dotIndex);
				});
			});

			root.addEventListener('pointerenter', function () {
				paused = true;
			});

			root.addEventListener('pointerleave', function () {
				paused = false;
			});

			root.addEventListener('focusin', function () {
				paused = true;
			});

			root.addEventListener('focusout', function () {
				paused = false;
			});

			show(0);
			startTimer();
		});
	});
}());

(function () {
	'use strict';

	if (!window.matchMedia || !document.body) {
		return;
	}

	var supportsFinePointer = window.matchMedia('(pointer: fine)').matches;
	var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	if (!supportsFinePointer || prefersReducedMotion) {
		return;
	}

	var dot = document.createElement('div');
	dot.className = 'siini-cursor-dot';
	dot.setAttribute('aria-hidden', 'true');
	document.body.appendChild(dot);

	var raf = 0;
	var targetX = 0;
	var targetY = 0;

	function paint() {
		dot.style.transform = 'translate3d(' + targetX + 'px, ' + targetY + 'px, 0) translate(-50%, -50%)';
		raf = 0;
	}

	window.addEventListener('pointermove', function (event) {
		targetX = event.clientX;
		targetY = event.clientY;
		dot.classList.add('is-visible');

		if (!raf) {
			raf = window.requestAnimationFrame(paint);
		}
	}, { passive: true });

	window.addEventListener('pointerleave', function () {
		dot.classList.remove('is-visible');
	});
}());

(function () {
	'use strict';

	function ready(callback) {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', callback);
			return;
		}

		callback();
	}

	ready(function () {
		var items = Array.prototype.slice.call(document.querySelectorAll('.siini-mega-nav__item'));
		var closeTimer = 0;

		if (!items.length) {
			return;
		}

		function setExpanded(item, expanded) {
			var trigger = item.querySelector('.siini-mega-nav__trigger');
			item.classList.toggle('is-open', expanded);
			if (trigger) {
				trigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
			}
		}

		function closeAll(except) {
			items.forEach(function (item) {
				if (item !== except) {
					setExpanded(item, false);
				}
			});
		}

		function openItem(item) {
			window.clearTimeout(closeTimer);
			closeAll(item);
			setExpanded(item, true);
		}

		function queueClose(item) {
			window.clearTimeout(closeTimer);
			closeTimer = window.setTimeout(function () {
				setExpanded(item, false);
			}, 120);
		}

		items.forEach(function (item) {
			item.addEventListener('pointerenter', function () {
				openItem(item);
			});

			item.addEventListener('pointerleave', function () {
				queueClose(item);
			});

			item.addEventListener('focusin', function () {
				openItem(item);
			});

			item.addEventListener('focusout', function (event) {
				if (!item.contains(event.relatedTarget)) {
					queueClose(item);
				}
			});
		});

		document.addEventListener('keydown', function (event) {
			if (event.key === 'Escape') {
				window.clearTimeout(closeTimer);
				closeAll(null);
			}
		});
	});
}());

(function () {
	'use strict';

	function ready(callback) {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', callback);
			return;
		}

		callback();
	}

	ready(function () {
		var details = document.querySelector('[data-siini-catalog-filters-details]');
		if (!details || !window.matchMedia) {
			return;
		}

		var desktopQuery = window.matchMedia('(min-width: 901px)');

		function sync() {
			details.open = desktopQuery.matches;
		}

		sync();

		if (desktopQuery.addEventListener) {
			desktopQuery.addEventListener('change', sync);
		} else if (desktopQuery.addListener) {
			desktopQuery.addListener(sync);
		}

		window.addEventListener('pageshow', sync);
	});
}());

(function () {
	'use strict';

	function ready(callback) {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', callback);
			return;
		}

		callback();
	}

	ready(function () {
		var roots = Array.prototype.slice.call(document.querySelectorAll('[data-siini-catalog-filters]'));
		var activeRoot = null;

		function initPriceSlider(root) {
			var slider = root.querySelector('[data-siini-price-slider]');
			if (!slider) {
				return;
			}

			var minRange = slider.querySelector('[data-siini-price-min]');
			var maxRange = slider.querySelector('[data-siini-price-max]');
			var minInput = root.querySelector('input[name="min_price"]');
			var maxInput = root.querySelector('input[name="max_price"]');
			var min = Number(slider.getAttribute('data-min') || 0);
			var max = Number(slider.getAttribute('data-max') || 50000);

			if (!minRange || !maxRange || !minInput || !maxInput) {
				return;
			}

			function clamp(value, fallback) {
				value = Number(value);
				if (!Number.isFinite(value)) {
					return fallback;
				}

				return Math.min(max, Math.max(min, value));
			}

			function inputValue(input, fallback) {
				return input.value.trim() === '' ? fallback : clamp(input.value, fallback);
			}

			function paint() {
				var minValue = clamp(minRange.value, min);
				var maxValue = clamp(maxRange.value, max);
				var minPercent = ((minValue - min) / (max - min)) * 100;
				var maxPercent = ((maxValue - min) / (max - min)) * 100;

				slider.style.setProperty('--siini-price-min', minPercent + '%');
				slider.style.setProperty('--siini-price-max', maxPercent + '%');
			}

			function syncFromRanges(changed) {
				var minValue = clamp(minRange.value, min);
				var maxValue = clamp(maxRange.value, max);

				if (minValue > maxValue) {
					if (changed === maxRange) {
						minValue = maxValue;
						minRange.value = String(minValue);
					} else {
						maxValue = minValue;
						maxRange.value = String(maxValue);
					}
				}

				minInput.value = minValue <= min ? '' : String(Math.round(minValue));
				maxInput.value = maxValue >= max ? '' : String(Math.round(maxValue));
				paint();
			}

			function syncFromInputs() {
				var minValue = inputValue(minInput, min);
				var maxValue = inputValue(maxInput, max);

				if (minValue > maxValue) {
					maxValue = minValue;
				}

				minRange.value = String(minValue);
				maxRange.value = String(maxValue);
				paint();
			}

			minRange.addEventListener('input', function () {
				syncFromRanges(minRange);
			});
			maxRange.addEventListener('input', function () {
				syncFromRanges(maxRange);
			});
			minInput.addEventListener('input', syncFromInputs);
			maxInput.addEventListener('input', syncFromInputs);
			syncFromInputs();
		}

		function setOpen(root, open) {
			var opener = root.querySelector('[data-siini-filter-open]');
			var panel = root.querySelector('.siini-catalog-filters__panel');

			root.classList.toggle('is-open', open);
			document.body.classList.toggle('siini-filter-drawer-open', open);

			if (opener) {
				opener.setAttribute('aria-expanded', open ? 'true' : 'false');
			}

			if (open) {
				activeRoot = root;
				window.setTimeout(function () {
					if (panel) {
						panel.focus({ preventScroll: true });
					}
				}, 40);
			} else if (activeRoot === root) {
				activeRoot = null;
			}
		}

		roots.forEach(function (root) {
			var opener = root.querySelector('[data-siini-filter-open]');
			initPriceSlider(root);

			if (opener) {
				opener.addEventListener('click', function () {
					setOpen(root, !root.classList.contains('is-open'));
				});
			}

			Array.prototype.slice.call(root.querySelectorAll('[data-siini-filter-close]')).forEach(function (button) {
				button.addEventListener('click', function () {
					setOpen(root, false);
					if (opener) {
						opener.focus({ preventScroll: true });
					}
				});
			});

			Array.prototype.slice.call(root.querySelectorAll('input[type="radio"], input[type="checkbox"]')).forEach(function (input) {
				input.addEventListener('change', function () {
					var name = input.name;
					if (input.type === 'radio' && name) {
						Array.prototype.slice.call(root.querySelectorAll('input[name="' + name.replace(/"/g, '\\"') + '"]')).forEach(function (option) {
							if (option.closest('label')) {
								option.closest('label').classList.toggle('is-active', option.checked);
							}
						});
						return;
					}

					if (input.closest('label')) {
						input.closest('label').classList.toggle('is-active', input.checked);
					}
				});
			});
		});

		document.addEventListener('keydown', function (event) {
			if (event.key === 'Escape' && activeRoot) {
				setOpen(activeRoot, false);
			}
		});

		document.addEventListener('click', function (event) {
			var closeTrigger = event.target.closest('[data-siini-filter-close]');
			if (!closeTrigger) {
				return;
			}

			var root = closeTrigger.closest('[data-siini-catalog-filters]');
			if (root) {
				setOpen(root, false);
			}
		});
	});
}());

(function () {
	'use strict';

	function ready(callback) {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', callback);
			return;
		}

		callback();
	}

	ready(function () {
		var panel = document.querySelector('[data-siini-search-panel]');
		var triggers = Array.prototype.slice.call(document.querySelectorAll('[data-siini-search-open]'));
		var input = panel ? panel.querySelector('[data-siini-search-input]') : null;
		var form = panel ? panel.querySelector('form') : null;

		if (!panel || !triggers.length || !input || !form) {
			return;
		}

		function setExpanded(open) {
			triggers.forEach(function (trigger) {
				trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
			});
		}

		function openSearch() {
			panel.hidden = false;
			document.body.classList.add('siini-search-open');
			setExpanded(true);
			window.setTimeout(function () {
				input.focus({ preventScroll: true });
			}, 40);
		}

		function closeSearch() {
			panel.hidden = true;
			document.body.classList.remove('siini-search-open');
			setExpanded(false);
		}

		function clearSearchLock() {
			panel.hidden = true;
			document.body.classList.remove('siini-search-open');
			document.documentElement.classList.remove('siini-search-open');
			setExpanded(false);
		}

		function submitSearch(event) {
			var query = input.value.trim();

			if (query === '') {
				event.preventDefault();
				input.focus();
				return;
			}

			event.preventDefault();
			input.value = query;
			clearSearchLock();
			window.location.assign('/?s=' + encodeURIComponent(query) + '&post_type=product');
		}

		triggers.forEach(function (trigger) {
			trigger.addEventListener('click', openSearch);
		});

		Array.prototype.slice.call(panel.querySelectorAll('[data-siini-search-close]')).forEach(function (button) {
			button.addEventListener('click', closeSearch);
		});

		form.addEventListener('submit', submitSearch);

		input.addEventListener('keydown', function (event) {
			if (event.key === 'Enter') {
				submitSearch(event);
			}
		});

		document.addEventListener('keydown', function (event) {
			if (event.key === 'Escape' && !panel.hidden) {
				closeSearch();
			}
		});

		window.addEventListener('pagehide', clearSearchLock);
		window.addEventListener('pageshow', clearSearchLock);
		document.addEventListener('DOMContentLoaded', clearSearchLock);
		clearSearchLock();
	});
}());

(function () {
	'use strict';

	var revealObserver = null;
	var resizeTimer = 0;

	function ready(callback) {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', callback);
			return;
		}

		callback();
	}

	function prefersReducedMotion() {
		return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	function catalogShells() {
		return Array.prototype.slice.call(document.querySelectorAll('.siini-catalog-product-shell'));
	}

	function catalogGrids() {
		return Array.prototype.slice.call(document.querySelectorAll([
			'.siini-catalog-product-shell [data-siini-catalog-grid] .siini-home-product-grid--catalog',
			'.siini-catalog-product-shell .siini-home-product-grid--catalog',
			'.siini-catalog-product-shell .siini-catalog-grid ul.products'
		].join(', ')));
	}

	function cardsForGrid(grid) {
		if (grid.matches && grid.matches('ul.products')) {
			return Array.prototype.slice.call(grid.querySelectorAll('li.product'));
		}

		return Array.prototype.slice.call(grid.querySelectorAll('.siini-home-product-card--catalog'));
	}

	function columnCount(grid, cards) {
		var styles = window.getComputedStyle ? window.getComputedStyle(grid) : null;
		var gap = styles ? parseFloat(styles.columnGap || styles.gap || '0') || 0 : 0;
		var gridWidth = grid.getBoundingClientRect().width;
		var cardWidth = cards[0] ? cards[0].getBoundingClientRect().width : 0;

		if (!gridWidth || !cardWidth) {
			return 1;
		}

		return Math.max(1, Math.round((gridWidth + gap) / (cardWidth + gap)));
	}

	function revealDelay(index, columns) {
		var isMobile = window.matchMedia && window.matchMedia('(max-width: 600px)').matches;
		var steps = Math.max(1, Math.min(columns, isMobile ? 2 : 4));

		return (index % steps) * (isMobile ? 50 : 70);
	}

	function showImmediately(cards) {
		document.documentElement.classList.remove('siini-product-reveal-ready');
		cards.forEach(function (card) {
			card.classList.add('is-visible');
			card.style.setProperty('--siini-reveal-delay', '0ms');
		});
	}

	function createObserver() {
		if (revealObserver || !('IntersectionObserver' in window)) {
			return revealObserver;
		}

		revealObserver = new window.IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (!entry.isIntersecting && entry.intersectionRatio <= 0) {
					return;
				}

				entry.target.classList.add('is-visible');
				entry.target.removeAttribute('data-siini-product-reveal-observed');
				revealObserver.unobserve(entry.target);
			});
		}, {
			rootMargin: '0px 0px -8% 0px',
			threshold: 0.12
		});

		return revealObserver;
	}

	function initProductReveal() {
		var grids = catalogGrids();
		var allCards = [];
		var observer;

		if (!grids.length) {
			document.documentElement.classList.remove('siini-product-reveal-ready');
			return;
		}

		grids.forEach(function (grid) {
			var cards = cardsForGrid(grid);
			var columns = columnCount(grid, cards);

			cards.forEach(function (card, index) {
				card.classList.add('siini-product-reveal');
				card.setAttribute('data-siini-product-reveal', '');
				card.style.setProperty('--siini-reveal-delay', revealDelay(index, columns) + 'ms');
				allCards.push(card);
			});
		});

		if (!allCards.length) {
			return;
		}

		if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
			showImmediately(allCards);
			return;
		}

		document.documentElement.classList.add('siini-product-reveal-ready');
		observer = createObserver();

		allCards.forEach(function (card) {
			if (card.classList.contains('is-visible') || card.getAttribute('data-siini-product-reveal-observed') === '1') {
				return;
			}

			card.setAttribute('data-siini-product-reveal-observed', '1');
			observer.observe(card);
		});
	}

	function observeCatalogChanges() {
		if (!('MutationObserver' in window)) {
			return;
		}

		catalogShells().forEach(function (shell) {
			if (shell.getAttribute('data-siini-product-reveal-mutations') === '1') {
				return;
			}

			shell.setAttribute('data-siini-product-reveal-mutations', '1');
			new window.MutationObserver(function (mutations) {
				var hasAddedNodes = mutations.some(function (mutation) {
					return mutation.addedNodes && mutation.addedNodes.length;
				});

				if (hasAddedNodes) {
					window.requestAnimationFrame(initProductReveal);
				}
			}).observe(shell, {
				childList: true,
				subtree: true
			});
		});
	}

	window.siiniInitProductReveal = initProductReveal;

	ready(function () {
		initProductReveal();
		observeCatalogChanges();

		window.addEventListener('resize', function () {
			window.clearTimeout(resizeTimer);
			resizeTimer = window.setTimeout(initProductReveal, 120);
		}, { passive: true });
	});
}());

(function () {
	'use strict';

	function ready(callback) {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', callback);
			return;
		}

		callback();
	}

	ready(function () {
		var elements = Array.prototype.slice.call(document.querySelectorAll('.siini-reveal'));
		var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		if (!elements.length) {
			return;
		}

		if (prefersReducedMotion || !('IntersectionObserver' in window)) {
			elements.forEach(function (element) {
				element.classList.add('is-visible');
			});
			return;
		}

		var observer = new window.IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (!entry.isIntersecting) {
					return;
				}

				entry.target.classList.add('is-visible');
				observer.unobserve(entry.target);
			});
		}, {
			rootMargin: '0px 0px -10% 0px',
			threshold: 0.12
		});

		elements.forEach(function (element) {
			observer.observe(element);
		});
	});
}());

(function () {
	'use strict';

	function ready(callback) {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', callback);
			return;
		}

		callback();
	}

	function fireChange(element) {
		element.dispatchEvent(new window.Event('change', { bubbles: true }));

		if (window.jQuery) {
			window.jQuery(element).trigger('change');
		}
	}

	function getQueryParam(name) {
		try {
			return new window.URLSearchParams(window.location.search).get(name) || '';
		} catch (error) {
			return '';
		}
	}

	function hasOptionValue(select, value) {
		return Array.prototype.some.call(select.options, function (option) {
			return option.value === value;
		});
	}

	function findSizeButton(buttons, selectedValue) {
		return buttons.find(function (button) {
			return !button.disabled && (button.getAttribute('data-value') || '') === selectedValue;
		}) || null;
	}

	function updateSizeHint(hint, button, selectedValue) {
		if (!hint) {
			return;
		}

		if (!selectedValue) {
			hint.textContent = 'Выберите размер, чтобы добавить в корзину.';
			return;
		}

		hint.textContent = 'Размер выбран: ' + (button ? (button.getAttribute('data-full-label') || button.textContent.trim()) : selectedValue) + '. Можно добавить товар в корзину.';
	}

	function setActiveSize(buttons, selectedValue) {
		buttons.forEach(function (button) {
			var value = button.getAttribute('data-value') || '';
			var isActive = !button.disabled && value && value === selectedValue;
			button.classList.toggle('is-active', isActive);
			button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
		});
	}

	function setSizeSystem(picker, system) {
		var options = Array.prototype.slice.call(picker.querySelectorAll('[data-siini-size-option]'));
		var tabs = Array.prototype.slice.call(picker.querySelectorAll('[data-siini-size-system]'));

		tabs.forEach(function (tab) {
			var isActive = tab.getAttribute('data-siini-size-system') === system;
			tab.classList.toggle('is-active', isActive);
			tab.setAttribute('aria-pressed', isActive ? 'true' : 'false');
		});

		options.forEach(function (option) {
			var value = option.querySelector('.siini-product-size-option__value');
			var label = option.getAttribute('data-label-' + system) || option.getAttribute('data-label-default') || option.textContent;

			if (value) {
				value.textContent = label;
			}
		});
	}

	function initSizePicker(picker) {
		var summary = picker.closest('.siini-product-summary-column') || document;
		var form = summary.querySelector('form.variations_form');
		var options = Array.prototype.slice.call(picker.querySelectorAll('[data-siini-size-option]'));
		var hint = picker.querySelector('[data-siini-size-hint]');

		if (!form || !options.length) {
			return;
		}

		var select = form.querySelector('select[name="attribute_pa_size"]');

		if (!select) {
			return;
		}

		var variationRow = select.closest('tr');
		if (variationRow) {
			variationRow.classList.add('siini-variation-row--enhanced');
		}

		picker.classList.add('is-ready');
		setActiveSize(options, select.value);
		updateSizeHint(hint, findSizeButton(options, select.value), select.value);

		options.forEach(function (button) {
			button.addEventListener('click', function () {
				if (button.disabled) {
					return;
				}

				var value = button.getAttribute('data-value') || '';

				select.value = value;
				fireChange(select);
				setActiveSize(options, value);
				updateSizeHint(hint, button, value);
			});
		});

		select.addEventListener('change', function () {
			setActiveSize(options, select.value);
			updateSizeHint(hint, findSizeButton(options, select.value), select.value);
		});

		Array.prototype.slice.call(picker.querySelectorAll('[data-siini-size-system]')).forEach(function (tab) {
			tab.addEventListener('click', function () {
				setSizeSystem(picker, tab.getAttribute('data-siini-size-system') || 'eu');
			});
		});

		var preselectedValue = getQueryParam('attribute_pa_size');
		if (preselectedValue && hasOptionValue(select, preselectedValue)) {
			select.value = preselectedValue;
			fireChange(select);
			setActiveSize(options, preselectedValue);
			updateSizeHint(hint, findSizeButton(options, preselectedValue), preselectedValue);
		}

		if (window.location.hash === '#size') {
			window.setTimeout(function () {
				picker.scrollIntoView({ block: 'center', behavior: 'smooth' });
			}, 180);
		}
	}

	ready(function () {
		Array.prototype.slice.call(document.querySelectorAll('[data-siini-size-picker]')).forEach(initSizePicker);
	});
}());

(function () {
	'use strict';

	function ready(callback) {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', callback);
			return;
		}

		callback();
	}

	function cleanText(text) {
		return (text || '').replace(/\s+/g, ' ').trim();
	}

	function initProductGallery() {
		var gallery = document.querySelector('.single-product .woocommerce-product-gallery');

		if (!gallery) {
			return;
		}

		var images = Array.prototype.slice.call(gallery.querySelectorAll('.woocommerce-product-gallery__image'));
		var total = images.length;

		if (total <= 1) {
			gallery.classList.add('siini-product-gallery--single');
			return;
		}

		var counter = document.createElement('div');
		counter.className = 'siini-product-gallery-counter';
		gallery.appendChild(counter);

		function getCurrentIndex() {
			var thumbs = Array.prototype.slice.call(gallery.querySelectorAll('.flex-control-nav img, .flex-control-thumbs img'));
			var activeThumb = thumbs.find(function (thumb) {
				return thumb.classList.contains('flex-active');
			});

			if (activeThumb) {
				return Math.max(0, thumbs.indexOf(activeThumb));
			}

			var activeImage = images.find(function (image) {
				return image.classList.contains('flex-active-slide') || image.getAttribute('aria-hidden') === 'false';
			});

			return activeImage ? Math.max(0, images.indexOf(activeImage)) : 0;
		}

		function updateCounter() {
			counter.textContent = (getCurrentIndex() + 1) + ' / ' + total;
		}

		updateCounter();
		gallery.addEventListener('click', function () {
			window.setTimeout(updateCounter, 90);
		});

		if ('MutationObserver' in window) {
			var observer = new window.MutationObserver(updateCounter);
			observer.observe(gallery, {
				attributes: true,
				attributeFilter: ['class', 'aria-hidden'],
				subtree: true
			});
		}
	}

	function initMobileProductCta() {
		var summary = document.querySelector('.single-product .siini-product-summary-column');

		if (!summary) {
			return;
		}

		var mainButton = summary.querySelector('.single_add_to_cart_button');
		var form = summary.querySelector('form.cart');

		if (!mainButton || !form) {
			return;
		}

		var select = form.querySelector('select[name="attribute_pa_size"]');
		var priceNode = summary.querySelector('.wp-block-woocommerce-product-price, .wc-block-components-product-price, .price');
		var productTitle = summary.querySelector('h1, .product_title');
		var sizePicker = document.getElementById('size') || summary.querySelector('[data-siini-size-picker]');
		var bar = document.createElement('div');
		bar.className = 'siini-product-mobile-cta';
		bar.setAttribute('aria-label', 'Быстрое добавление в корзину');
		bar.innerHTML = '<div class="siini-product-mobile-cta__meta"><span class="siini-product-mobile-cta__label"></span><span class="siini-product-mobile-cta__price"></span></div><button class="siini-product-mobile-cta__button" type="button"></button>';

		var label = bar.querySelector('.siini-product-mobile-cta__label');
		var price = bar.querySelector('.siini-product-mobile-cta__price');
		var button = bar.querySelector('.siini-product-mobile-cta__button');

		function activeSizeLabel() {
			var active = summary.querySelector('[data-siini-size-option].is-active');
			return active ? cleanText(active.getAttribute('data-full-label') || active.textContent) : '';
		}

		function needsVariation() {
			return !!select && form.classList.contains('variations_form');
		}

		function isMainButtonDisabled() {
			return mainButton.disabled ||
				mainButton.classList.contains('disabled') ||
				mainButton.classList.contains('wc-variation-selection-needed') ||
				!!mainButton.closest('.woocommerce-variation-add-to-cart-disabled') ||
				(needsVariation() && !select.value);
		}

		function mainButtonRect() {
			return mainButton.getBoundingClientRect();
		}

		function isSizePickerActiveInViewport() {
			if (!sizePicker) {
				return false;
			}

			var rect = sizePicker.getBoundingClientRect();
			var reservedBottom = window.innerHeight - Math.max(bar.offsetHeight, 72) - 18;

			return rect.top < reservedBottom && rect.bottom > 0;
		}

		function isMainButtonVisible() {
			var rect = mainButton.getBoundingClientRect();
			return rect.top < window.innerHeight && rect.bottom > 0;
		}

		function updateVisibility() {
			var buttonRect = mainButtonRect();
			var reserveTop = window.innerHeight - Math.max(bar.offsetHeight, 72) - 22;
			var titleIsClear = !productTitle || productTitle.getBoundingClientRect().bottom < reserveTop;
			var hasScrolledPastMainButton = buttonRect.bottom < -8;
			var shouldShow = window.innerWidth <= 760 && titleIsClear && hasScrolledPastMainButton && !isMainButtonVisible() && !isSizePickerActiveInViewport();

			bar.classList.toggle('is-visible', shouldShow);
			document.body.classList.toggle('has-siini-mobile-cta-visible', shouldShow);
		}

		function updateBar() {
			var selectedSize = activeSizeLabel();
			var disabled = isMainButtonDisabled();

			label.textContent = selectedSize ? 'Размер ' + selectedSize : 'Выберите размер';
			price.textContent = priceNode ? cleanText(priceNode.textContent) : '';
			button.textContent = disabled && needsVariation() && !select.value ? 'Размер' : (cleanText(mainButton.textContent) || 'Добавить');
			button.classList.toggle('is-disabled', disabled);
			button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
			updateVisibility();
		}

		button.addEventListener('click', function () {
			if (isMainButtonDisabled()) {
				if (sizePicker) {
					sizePicker.scrollIntoView({ block: 'center', behavior: 'smooth' });
				}
				return;
			}

			mainButton.click();
		});

		document.body.appendChild(bar);
		document.body.classList.add('has-siini-mobile-cta');
		updateBar();

		form.addEventListener('change', updateBar);
		window.addEventListener('scroll', updateVisibility, { passive: true });
		window.addEventListener('resize', updateVisibility);
		summary.addEventListener('click', function (event) {
			if (event.target && event.target.closest && event.target.closest('[data-siini-size-option]')) {
				window.setTimeout(updateBar, 60);
			}
		});

		if (window.jQuery) {
			window.jQuery(form).on('found_variation reset_data hide_variation show_variation', updateBar);
		}

		if ('MutationObserver' in window) {
			var observer = new window.MutationObserver(updateBar);
			observer.observe(mainButton, {
				attributes: true,
				attributeFilter: ['class', 'disabled']
			});
		}
	}

	ready(function () {
		initProductGallery();
		initMobileProductCta();
	});
}());

(function () {
	'use strict';

	function ready(callback) {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', callback);
			return;
		}

		callback();
	}

	function withQuantity(url, quantity) {
		try {
			var next = new window.URL(url, window.location.origin);
			next.searchParams.set('quantity', String(quantity));
			return next.toString();
		} catch (error) {
			return url;
		}
	}

	function setSystem(slide, system) {
		var systems = Array.prototype.slice.call(slide.querySelectorAll('[data-siini-promo-size-system]'));
		var options = Array.prototype.slice.call(slide.querySelectorAll('[data-siini-promo-size]'));

		systems.forEach(function (button) {
			var active = button.getAttribute('data-siini-promo-size-system') === system;
			button.classList.toggle('is-active', active);
			button.setAttribute('aria-pressed', active ? 'true' : 'false');
		});

		options.forEach(function (button) {
			var label = button.getAttribute('data-label-' + system) || button.getAttribute('data-label-default') || button.textContent.trim();
			var value = button.querySelector('span');
			if (value) {
				value.textContent = label;
			}
		});
	}

	function activeSize(slide) {
		return slide.querySelector('[data-siini-promo-size].is-active:not(:disabled)');
	}

	function refreshPurchase(slide) {
		var quantity = Math.max(1, parseInt(slide.getAttribute('data-siini-promo-quantity') || '1', 10) || 1);
		var add = slide.querySelector('[data-siini-promo-add]');
		var buy = slide.querySelector('[data-siini-promo-buy]');
		var hint = slide.querySelector('[data-siini-promo-hint]');
		var selected = activeSize(slide);

		if (selected) {
			if (add && selected.getAttribute('data-cart-url')) {
				add.href = withQuantity(selected.getAttribute('data-cart-url'), quantity);
				add.classList.remove('is-disabled');
				add.setAttribute('aria-disabled', 'false');
			}

			if (buy && selected.getAttribute('data-checkout-url')) {
				buy.href = withQuantity(selected.getAttribute('data-checkout-url'), quantity);
				buy.classList.remove('is-disabled');
				buy.setAttribute('aria-disabled', 'false');
			}

			if (hint) {
				hint.textContent = 'Размер выбран. Можно добавить товар в корзину.';
			}

			return;
		}

		if (add) {
			add.href = withQuantity(add.href, quantity);
		}

		if (buy) {
			buy.href = withQuantity(buy.href, quantity);
		}
	}

	function initSlide(slide) {
		slide.setAttribute('data-siini-promo-quantity', '1');

		Array.prototype.slice.call(slide.querySelectorAll('[data-siini-promo-size]')).forEach(function (button) {
			button.addEventListener('click', function () {
				if (button.disabled) {
					return;
				}

				Array.prototype.slice.call(slide.querySelectorAll('[data-siini-promo-size]')).forEach(function (option) {
					var active = option === button;
					option.classList.toggle('is-active', active);
					option.setAttribute('aria-pressed', active ? 'true' : 'false');
				});

				refreshPurchase(slide);
			});
		});

		Array.prototype.slice.call(slide.querySelectorAll('[data-siini-promo-size-system]')).forEach(function (button) {
			button.addEventListener('click', function () {
				setSystem(slide, button.getAttribute('data-siini-promo-size-system') || 'eu');
			});
		});

		var value = slide.querySelector('[data-siini-promo-qty-value]');
		var minus = slide.querySelector('[data-siini-promo-qty-minus]');
		var plus = slide.querySelector('[data-siini-promo-qty-plus]');

		function setQuantity(nextValue) {
			var quantity = Math.min(9, Math.max(1, nextValue));
			slide.setAttribute('data-siini-promo-quantity', String(quantity));
			if (value) {
				value.textContent = String(quantity);
			}
			refreshPurchase(slide);
		}

		if (minus) {
			minus.addEventListener('click', function () {
				setQuantity((parseInt(slide.getAttribute('data-siini-promo-quantity') || '1', 10) || 1) - 1);
			});
		}

		if (plus) {
			plus.addEventListener('click', function () {
				setQuantity((parseInt(slide.getAttribute('data-siini-promo-quantity') || '1', 10) || 1) + 1);
			});
		}

		Array.prototype.slice.call(slide.querySelectorAll('[data-siini-promo-add], [data-siini-promo-buy]')).forEach(function (link) {
			link.addEventListener('click', function (event) {
				if (link.classList.contains('is-disabled') || link.getAttribute('aria-disabled') === 'true') {
					event.preventDefault();
				}
			});
		});

		refreshPurchase(slide);
	}

	function initRotator(root) {
		var slides = Array.prototype.slice.call(root.querySelectorAll('[data-siini-promo-slide]'));
		var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		var activeIndex = Math.max(0, slides.findIndex(function (slide) {
			return slide.classList.contains('is-active');
		}));
		var paused = false;

		if (!slides.length) {
			return;
		}

		slides.forEach(initSlide);

		function show(index) {
			activeIndex = (index + slides.length) % slides.length;
			slides.forEach(function (slide, slideIndex) {
				var active = slideIndex === activeIndex;
				slide.classList.toggle('is-active', active);
				slide.setAttribute('aria-hidden', active ? 'false' : 'true');
			});
		}

		if (!prefersReducedMotion && slides.length > 1) {
			window.setInterval(function () {
				if (!paused) {
					show(activeIndex + 1);
				}
			}, 5600);

			root.addEventListener('pointerenter', function () {
				paused = true;
			});
			root.addEventListener('pointerleave', function () {
				paused = false;
			});
			root.addEventListener('focusin', function () {
				paused = true;
			});
			root.addEventListener('focusout', function () {
				paused = false;
			});
		}

		Array.prototype.slice.call(root.querySelectorAll('[data-siini-promo-share]')).forEach(function (button) {
			var originalText = button.textContent;
			button.addEventListener('click', function () {
				var shareUrl = button.getAttribute('data-share-url') || window.location.href;
				if (window.navigator.share) {
					window.navigator.share({ url: shareUrl }).catch(function () {});
					return;
				}

				if (window.navigator.clipboard) {
					window.navigator.clipboard.writeText(shareUrl).then(function () {
						button.textContent = 'Ссылка скопирована';
						window.setTimeout(function () {
							button.textContent = originalText;
						}, 1600);
					});
				}
			});
		});
	}

	ready(function () {
		Array.prototype.slice.call(document.querySelectorAll('[data-siini-promo-rotator]')).forEach(initRotator);
	});
}());

(function () {
	'use strict';

	var storage = {
		get: function (key) {
			try {
				return window.localStorage.getItem(key);
			} catch (error) {
				return null;
			}
		},
		set: function (key, value) {
			try {
				window.localStorage.setItem(key, value);
			} catch (error) {
				// Ignore storage restrictions; the UI remains usable for this visit.
			}
		}
	};

	var cookieNotice = document.querySelector('[data-siini-cookie-notice]');
	var cookieAccept = document.querySelector('[data-siini-cookie-accept]');
	var newsletter = document.querySelector('[data-siini-newsletter]');
	var newsletterClose = document.querySelector('[data-siini-newsletter-close]');
	var newsletterForm = document.querySelector('[data-siini-newsletter-form]');
	var newsletterMessage = document.querySelector('[data-siini-newsletter-message]');
	var conciergeForm = document.querySelector('[data-siini-concierge-form]');
	var conciergeMessage = document.querySelector('[data-siini-concierge-message]');
	var config = window.siiniSite || {};
	var messages = config.messages || {};
	var newsletterQueued = false;
	var newsletterEngagementBound = false;
	var newsletterClosedKey = 'siini_newsletter_closed_v2';
	var newsletterSubscribedKey = 'siini_newsletter_subscribed_v2';
	var cookieAcceptedKey = 'siini_cookie_notice_accepted';

	function canShowNewsletter() {
		return newsletter && storage.get(cookieAcceptedKey) && !storage.get(newsletterClosedKey) && !storage.get(newsletterSubscribedKey);
	}

	function showNewsletter(delay) {
		if (!canShowNewsletter()) {
			return;
		}

		if (newsletterQueued || newsletter.classList.contains('is-visible')) {
			return;
		}

		newsletterQueued = true;
		window.setTimeout(function () {
			newsletterQueued = false;
			if (!canShowNewsletter()) {
				return;
			}
			newsletter.hidden = false;
			newsletter.classList.add('is-visible');
		}, delay);
	}

	function restoreCookieNotice() {
		if (!cookieNotice || storage.get(cookieAcceptedKey)) {
			return;
		}

		cookieNotice.hidden = false;
		cookieNotice.classList.add('is-visible');
	}

	function showNewsletterAfterEngagement() {
		if (!canShowNewsletter()) {
			return;
		}

		var scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
		var progress = window.scrollY / scrollable;
		if (progress > 0.48) {
			showNewsletter(1200);
			window.removeEventListener('scroll', showNewsletterAfterEngagement);
			newsletterEngagementBound = false;
		}
	}

	function armNewsletterAfterEngagement() {
		if (!canShowNewsletter() || newsletterEngagementBound) {
			return;
		}

		newsletterEngagementBound = true;
		window.addEventListener('scroll', showNewsletterAfterEngagement, { passive: true });
		window.setTimeout(function () {
			if (newsletterEngagementBound) {
				showNewsletter(0);
			}
		}, 45000);
	}

	if (cookieNotice && cookieAccept) {
		if (storage.get(cookieAcceptedKey)) {
			armNewsletterAfterEngagement();
		} else {
			cookieNotice.hidden = false;
			cookieNotice.classList.add('is-visible');
		}

		cookieAccept.addEventListener('click', function () {
			storage.set(cookieAcceptedKey, '1');
			cookieNotice.classList.remove('is-visible');
			cookieNotice.hidden = true;
			armNewsletterAfterEngagement();
		});
	} else {
		armNewsletterAfterEngagement();
	}

	if (newsletterClose && newsletter) {
		newsletterClose.addEventListener('click', function () {
			storage.set(newsletterClosedKey, String(Date.now()));
			newsletter.classList.remove('is-visible');
			newsletter.hidden = true;
			restoreCookieNotice();
		});
	}

	if (newsletterForm && newsletterMessage && config.newsletterEndpoint && window.fetch) {
		newsletterForm.addEventListener('submit', function (event) {
			event.preventDefault();

			if (!newsletterForm.reportValidity()) {
				return;
			}

			var submitButton = newsletterForm.querySelector('button[type="submit"]');
			var body = new window.URLSearchParams(new window.FormData(newsletterForm));
			body.set('source', 'newsletter-popup');
			body.set('page_url', window.location.href);

			if (submitButton) {
				submitButton.disabled = true;
			}
			newsletterMessage.textContent = messages.sending || 'Отправляем...';

			window.fetch(config.newsletterEndpoint, {
				method: 'POST',
				credentials: 'same-origin',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
				},
				body: body.toString()
			})
				.then(function (response) {
					return response.json().then(function (payload) {
						if (!response.ok || !payload.ok) {
							throw new Error(payload.message || messages.error || 'Не получилось отправить.');
						}
						return payload;
					});
				})
				.then(function (payload) {
					storage.set(newsletterSubscribedKey, '1');
					newsletterMessage.textContent = payload.message || messages.success || 'Готово.';
					window.setTimeout(function () {
						newsletter.classList.remove('is-visible');
						newsletter.hidden = true;
						restoreCookieNotice();
					}, 1800);
				})
				.catch(function (error) {
					newsletterMessage.textContent = error.message || messages.error || 'Не получилось отправить.';
				})
				.finally(function () {
					if (submitButton) {
						submitButton.disabled = false;
					}
				});
		});
	}

	if (conciergeForm && conciergeMessage && config.conciergeEndpoint && window.fetch) {
		conciergeForm.addEventListener('submit', function (event) {
			event.preventDefault();

			if (!conciergeForm.reportValidity()) {
				return;
			}

			var submitButton = conciergeForm.querySelector('button[type="submit"]');
			var body = new window.URLSearchParams(new window.FormData(conciergeForm));
			body.set('page_url', window.location.href);

			if (submitButton) {
				submitButton.disabled = true;
			}
			conciergeMessage.textContent = messages.sending || 'Отправляем...';

			window.fetch(config.conciergeEndpoint, {
				method: 'POST',
				credentials: 'same-origin',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
				},
				body: body.toString()
			})
				.then(function (response) {
					return response.json().then(function (payload) {
						if (!response.ok || !payload.ok) {
							throw new Error(payload.message || messages.error || 'Не получилось отправить.');
						}
						return payload;
					});
				})
				.then(function (payload) {
					conciergeMessage.textContent = payload.message || messages.success || 'Готово.';
					conciergeForm.reset();
				})
				.catch(function (error) {
					conciergeMessage.textContent = error.message || messages.error || 'Не получилось отправить.';
				})
				.finally(function () {
					if (submitButton) {
						submitButton.disabled = false;
					}
				});
		});
	}
}());

(function () {
	'use strict';

	function ready(callback) {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', callback);
			return;
		}

		callback();
	}

	function itemWord(count) {
		var abs = Math.abs(count);
		var lastTwo = abs % 100;
		var last = abs % 10;

		if (lastTwo >= 11 && lastTwo <= 14) {
			return 'товаров';
		}

		if (last === 1) {
			return 'товар';
		}

		if (last >= 2 && last <= 4) {
			return 'товара';
		}

		return 'товаров';
	}

	function replaceText(node, from, to) {
		if (!node) {
			return;
		}

		var text = (node.textContent || '').trim();
		if (text === from || text.indexOf(from) !== -1) {
			var nextText = text.replace(from, to);
			if (node.textContent !== nextText) {
				node.textContent = nextText;
			}
		}
	}

	function setTextIfChanged(node, text) {
		if (node && node.textContent !== text) {
			node.textContent = text;
		}
	}

	function setAttributeIfChanged(node, name, value) {
		if (node && node.getAttribute(name) !== value) {
			node.setAttribute(name, value);
		}
	}

	function localizeDrawer(drawer) {
		if (!drawer) {
			return;
		}

		var close = drawer.querySelector('.wc-block-components-drawer__close');
		var count = drawer.querySelector('.wp-block-woocommerce-mini-cart-title-items-counter-block');
		var label = drawer.querySelector('.wp-block-woocommerce-mini-cart-title-label-block');
		var subtotal = drawer.querySelector('.wc-block-mini-cart__footer-subtotal .wc-block-components-totals-item__label');
		var description = drawer.querySelector('.wc-block-mini-cart__footer-subtotal .wc-block-components-totals-item__description');

		if (close) {
			setAttributeIfChanged(close, 'aria-label', 'Закрыть корзину');
			setAttributeIfChanged(close, 'title', 'Закрыть корзину');
		}

		setTextIfChanged(label, 'Корзина');

		if (count) {
			var match = (count.textContent || '').match(/\d+/);
			var amount = match ? parseInt(match[0], 10) : 0;
			setTextIfChanged(count, amount > 0 ? '(' + amount + ' ' + itemWord(amount) + ')' : '');
		}

		setTextIfChanged(subtotal, 'Итого');

		setTextIfChanged(description, 'Доставка и скидки рассчитываются при оформлении заказа.');

		Array.prototype.slice.call(drawer.querySelectorAll('caption h2, .screen-reader-text')).forEach(function (node) {
			replaceText(node, 'Products in cart', 'Товары в корзине');
			replaceText(node, 'Product', 'Товар');
			replaceText(node, 'Details', 'Детали');
			replaceText(node, 'Total', 'Сумма');
			replaceText(node, 'Previous price:', 'Старая цена:');
			replaceText(node, 'Discounted price:', 'Цена со скидкой:');
		});

		Array.prototype.slice.call(drawer.querySelectorAll('.wc-block-cart-items__header span')).forEach(function (node) {
			replaceText(node, 'Product', 'Товар');
			replaceText(node, 'Details', 'Детали');
			replaceText(node, 'Total', 'Сумма');
		});

		Array.prototype.slice.call(drawer.querySelectorAll('.wc-block-mini-cart__empty-cart-wrapper p')).forEach(function (node) {
			replaceText(node, 'Your cart is currently empty!', 'Корзина пока пуста.');
		});

		Array.prototype.slice.call(drawer.querySelectorAll('.wc-block-mini-cart__shopping-button .wc-block-components-button__text')).forEach(function (node) {
			replaceText(node, 'Start shopping', 'Перейти в каталог');
		});
	}

	ready(function () {
		var observer = null;
		var isApplying = false;
		var queued = false;

		function apply() {
			if (isApplying) {
				return;
			}

			isApplying = true;
			var drawer = document.querySelector('.wc-block-mini-cart__drawer, .wc-block-components-drawer');
			localizeDrawer(drawer);
			if (drawer && !observer && window.MutationObserver) {
				observer = new window.MutationObserver(function () {
					if (queued) {
						return;
					}

					queued = true;
					window.requestAnimationFrame(function () {
						queued = false;
						localizeDrawer(drawer);
					});
				});
				observer.observe(drawer, {
					childList: true,
					subtree: true
				});
			}
			isApplying = false;
		}

		apply();
		document.addEventListener('click', function (event) {
			if (event.target && event.target.closest && event.target.closest('.wc-block-mini-cart__button')) {
				window.setTimeout(apply, 0);
				window.setTimeout(apply, 350);
				window.setTimeout(apply, 1000);
			}
		});
		document.body.addEventListener('wc-blocks_added_to_cart', function () {
			window.setTimeout(apply, 350);
			window.setTimeout(apply, 1000);
		});
	});

	ready(function () {
		var quantityInputs = Array.prototype.slice.call(document.querySelectorAll('.siini-commerce-flow .quantity input.qty'));

		Array.prototype.slice.call(document.querySelectorAll('.siini-commerce-flow--checkout .optional')).forEach(function (node) {
			if ((node.textContent || '').trim() === '(optional)') {
				node.textContent = '(необязательно)';
			}
		});

		Array.prototype.slice.call(document.querySelectorAll('.quantity label')).forEach(function (node) {
			if (/ quantity$/i.test((node.textContent || '').trim())) {
				node.textContent = node.textContent.replace(/ quantity$/i, ' количество');
			}
		});

		quantityInputs.forEach(function (input) {
			var quantity = input.closest('.quantity');
			var minus;
			var plus;

			if (!quantity || quantity.getAttribute('data-siini-quantity-ready') === 'true') {
				return;
			}

			quantity.setAttribute('data-siini-quantity-ready', 'true');
			quantity.classList.add('siini-quantity-stepper');

			minus = document.createElement('button');
			minus.type = 'button';
			minus.className = 'siini-quantity-stepper__button siini-quantity-stepper__button--minus';
			minus.setAttribute('aria-label', 'Уменьшить количество');
			minus.textContent = '−';

			plus = document.createElement('button');
			plus.type = 'button';
			plus.className = 'siini-quantity-stepper__button siini-quantity-stepper__button--plus';
			plus.setAttribute('aria-label', 'Увеличить количество');
			plus.textContent = '+';

			quantity.insertBefore(minus, input);
			quantity.appendChild(plus);

			function valueBounds() {
				return {
					max: input.max === '' ? Infinity : parseFloat(input.max),
					min: input.min === '' ? 0 : parseFloat(input.min),
					step: input.step === '' || input.step === 'any' ? 1 : parseFloat(input.step)
				};
			}

			function updateDisabled() {
				var bounds = valueBounds();
				var value = parseFloat(input.value) || bounds.min || 0;

				minus.disabled = value <= bounds.min;
				plus.disabled = value >= bounds.max;
			}

			function change(direction) {
				var bounds = valueBounds();
				var value = parseFloat(input.value) || bounds.min || 0;
				var next = value + (direction * bounds.step);

				next = Math.max(bounds.min, Math.min(bounds.max, next));
				input.value = String(next);
				input.dispatchEvent(new Event('input', { bubbles: true }));
				input.dispatchEvent(new Event('change', { bubbles: true }));
				updateDisabled();
			}

			minus.addEventListener('click', function () {
				change(-1);
			});

			plus.addEventListener('click', function () {
				change(1);
			});

			input.addEventListener('input', updateDisabled);
			input.addEventListener('change', updateDisabled);
			updateDisabled();
		});
	});
}());
