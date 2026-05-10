(function () {
	'use strict';

	function ready(fn) {
		if (document.readyState !== 'loading') fn();
		else document.addEventListener('DOMContentLoaded', fn);
	}

	function slugify(text) {
		return text
			.toLowerCase()
			.trim()
			.replace(/[^\w\s-]/g, '')
			.replace(/\s+/g, '-');
	}

	ready(function () {
		var toc = document.getElementById('post-toc');
		if (!toc) return;

		var article = document.querySelector('.article_body');
		if (!article) return;

		var headings = article.querySelectorAll('h2, h3');
		if (!headings.length) return;

		var list = toc.querySelector('.toc-list');
		var linksById = {};
		var currentH2Sublist = null;

		headings.forEach(function (h, i) {
			if (!h.id) {
				var base = slugify(h.textContent) || 'section-' + i;
				var id = base, n = 2;
				while (document.getElementById(id)) id = base + '-' + n++;
				h.id = id;
			}

			var li = document.createElement('li');
			var a = document.createElement('a');
			a.href = '#' + h.id;
			a.textContent = h.textContent;
			a.dataset.target = h.id;
			li.appendChild(a);
			linksById[h.id] = a;

			if (h.tagName === 'H2') {
				list.appendChild(li);
				currentH2Sublist = null;
			} else {
				if (!currentH2Sublist) {
					var lastTopLi = list.lastElementChild;
					if (!lastTopLi) {
						list.appendChild(li);
						return;
					}
					currentH2Sublist = document.createElement('ol');
					lastTopLi.appendChild(currentH2Sublist);
				}
				currentH2Sublist.appendChild(li);
			}
		});

		toc.removeAttribute('hidden');

		list.addEventListener('click', function (e) {
			var a = e.target.closest('a[data-target]');
			if (!a) return;
			var el = document.getElementById(a.dataset.target);
			if (!el) return;
			e.preventDefault();
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
			history.replaceState(null, '', '#' + a.dataset.target);
		});

		if ('IntersectionObserver' in window) {
			var visible = new Set();
			var observer = new IntersectionObserver(function (entries) {
				entries.forEach(function (entry) {
					if (entry.isIntersecting) visible.add(entry.target.id);
					else visible.delete(entry.target.id);
				});

				Object.values(linksById).forEach(function (l) { l.classList.remove('is-active'); });

				var activeId = null;
				if (visible.size) {
					headings.forEach(function (h) {
						if (visible.has(h.id) && !activeId) activeId = h.id;
					});
				}
				if (activeId && linksById[activeId]) {
					linksById[activeId].classList.add('is-active');
				}
			}, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });

			headings.forEach(function (h) { observer.observe(h); });
		}
	});
})();
