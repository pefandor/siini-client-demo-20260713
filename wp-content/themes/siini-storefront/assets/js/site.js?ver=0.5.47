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
		var rotators = Array.prototype.slice.call(document.querySelectorAll('[data-siini-new-rotator]'));
		var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		rotators.forEach(function (rotator) {
			var slides = Array.prototype.slice.call(rotator.querySelectorAll('[data-siini-new-slide]'));
			var section = rotator.closest('[data-siini-home-new]');
			var prevButton = section ? section.querySelector('[data-siini-new-prev]') : null;
			var nextButton = section ? section.querySelector('[data-siini-new-next]') : null;
			var activeIndex = 0;
			var timer = 0;

			function visibleCount() {
				if (window.matchMedia && window.matchMedia('(max-width: 430px)').matches) {
					return 1;
				}

				return Math.min(2, slides.length);
			}

			if (slides.length <= 1) {
				if (prevButton) {
					prevButton.disabled = true;
				}
				if (nextButton) {
					nextButton.disabled = true;
				}
				return;
			}

			function showFrom(nextIndex) {
				activeIndex = (nextIndex + slides.length) % slides.length;
				var visible = visibleCount();

				slides.forEach(function (slide, index) {
					var isActive = false;
					for (var offset = 0; offset < visible; offset += 1) {
						if (index === (activeIndex + offset) % slides.length) {
							isActive = true;
						}
					}
					slide.classList.toggle('is-active', isActive);
					slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
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
					showFrom(activeIndex + 1);
				}, 4200);
			}

			function manual(direction) {
				stopTimer();
				showFrom(activeIndex + direction);
				window.setTimeout(startTimer, 6200);
			}

			if (prevButton) {
				prevButton.addEventListener('click', function () {
					manual(-1);
				});
			}

			if (nextButton) {
				nextButton.addEventListener('click', function () {
					manual(1);
				});
			}

			if (window.addEventListener) {
				window.addEventListener('resize', function () {
					showFrom(activeIndex);
				}, { passive: true });
			}

			showFrom(activeIndex);
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

		options.forEach(function (button) {
			button.addEventListener('click', function () {
				if (button.disabled) {
					return;
				}

				var value = button.getAttribute('data-value') || '';

				select.value = value;
				fireChange(select);
				setActiveSize(options, value);

				if (hint) {
					hint.textContent = value ? 'Размер выбран: ' + (button.getAttribute('data-full-label') || button.textContent.trim()) + '. Можно добавить товар в корзину.' : 'Выберите размер.';
				}
			});
		});

		select.addEventListener('change', function () {
			setActiveSize(options, select.value);
		});

		Array.prototype.slice.call(picker.querySelectorAll('[data-siini-size-system]')).forEach(function (tab) {
			tab.addEventListener('click', function () {
				setSizeSystem(picker, tab.getAttribute('data-siini-size-system') || 'eu');
			});
		});
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
