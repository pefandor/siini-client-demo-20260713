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
			var cards = Array.prototype.slice.call(scroller.querySelectorAll('[data-siini-new-card]'));
			var section = scroller.closest('[data-siini-home-new]');
			var prevButton = section ? section.querySelector('[data-siini-new-prev]') : null;
			var nextButton = section ? section.querySelector('[data-siini-new-next]') : null;
			var carousel = scroller.closest('.siini-home-new-carousel');
			var frame = 0;
			var currentIndex = 0;

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

			function updateButtons() {
				var hasOverflow = canScroll();
				var atStart = scroller.scrollLeft <= 2;
				var atEnd = Math.ceil(scroller.scrollLeft) >= Math.max(0, scroller.scrollWidth - scroller.clientWidth) - 2;
				var targets = scrollTargets();

				currentIndex = nearestIndex(targets);

				if (prevButton) {
					prevButton.disabled = !hasOverflow || atStart;
				}

				if (nextButton) {
					nextButton.disabled = !hasOverflow || atEnd;
				}

				if (carousel) {
					carousel.classList.toggle('is-at-start', atStart);
					carousel.classList.toggle('is-at-end', atEnd);
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

			function move(direction) {
				var targets = scrollTargets();
				var scrollLeft = scroller.scrollLeft;
				var targetIndex = currentIndex;

				if (direction > 0) {
					targetIndex = targets.findIndex(function (target) {
						return target > scrollLeft + 2;
					});
					if (targetIndex < 0) {
						targetIndex = targets.length - 1;
					}
				} else {
					for (var index = targets.length - 1; index >= 0; index -= 1) {
						if (targets[index] < scrollLeft - 2) {
							targetIndex = index;
							break;
						}
					}
				}

				currentIndex = Math.max(0, Math.min(targets.length - 1, targetIndex));
				scroller.scrollTo({
					behavior: prefersReducedMotion ? 'auto' : 'smooth',
					left: targets[currentIndex],
				});
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

			scroller.addEventListener('scroll', scheduleUpdate, { passive: true });
			window.addEventListener('resize', function () {
				window.setTimeout(function () {
					var targets = scrollTargets();
					scroller.scrollTo({
						behavior: 'auto',
						left: targets[Math.max(0, Math.min(targets.length - 1, currentIndex))],
					});
					updateButtons();
				}, 120);
			}, { passive: true });

			updateButtons();
			window.setTimeout(updateButtons, 250);
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
