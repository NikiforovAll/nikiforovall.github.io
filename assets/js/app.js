(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
  function $1(sel, root) { return (root || document).querySelector(sel); }
  function isVisible(el) { return el && el.offsetParent !== null; }

  ready(function init() {
    /* Sidebar min-height = full document height */
    var sidebar = $1('.sidebar');
    if (sidebar) {
      sidebar.style.minHeight = document.documentElement.scrollHeight + 'px';
    }

    /* Secondary contact links: show on hover (no fade — minor regression vs jQuery fadeIn) */
    var scontacts = $1('#contact-list-secondary');
    var contactList = $1('#contact-list');
    if (scontacts) scontacts.style.display = 'none';
    if (contactList && scontacts) {
      contactList.addEventListener('mouseenter', function () { scontacts.style.display = ''; });
      contactList.addEventListener('mouseleave', function () { scontacts.style.display = 'none'; });
    }

    /**
     * Vanilla replacement for Bootstrap's $.fn.tab('show'): toggles .active on the
     * <li> and the matching .tab-pane. No fade transition.
     */
    function showTab(a) {
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) !== '#') return;
      $$('.cat-tag-menu li.active').forEach(function (li) { li.classList.remove('active'); });
      var li = a.parentElement;
      if (li && li.tagName === 'LI') li.classList.add('active');
      $$('.tab-pane.active').forEach(function (p) { p.classList.remove('active', 'in'); });
      var pane = document.querySelector(href);
      if (pane) pane.classList.add('active', 'in');
    }

    function activateTab() {
      if (['/tags.html', '/categories.html', '/topics.html'].indexOf(window.location.pathname) === -1) return;
      if (!$$('.tab-pane').length) return;
      var hash = window.location.hash;
      if (hash) {
        showTab(document.querySelector('a[href="' + hash + '"]'));
      } else {
        showTab($1('.cat-tag-menu li a'));
      }
    }

    /* Tab menu click: switch tab without page reload */
    document.addEventListener('click', function (e) {
      var a = e.target.closest('.cat-tag-menu li a[href^="#"]');
      if (!a) return;
      e.preventDefault();
      showTab(a);
      history.replaceState(null, '', a.getAttribute('href'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('hashchange', activateTab);
    activateTab();

    /* Mobile navbar collapse */
    var navToggle = $1('#navbar-collapse-toggle');
    var navCollapse = $1('#bs-example-navbar-collapse-1');
    if (navToggle && navCollapse) {
      navToggle.addEventListener('click', function () {
        var open = navCollapse.classList.toggle('in');
        navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    /* Dropdown menu (#nav-menu) */
    var navMenu = $1('#nav-menu');
    if (navMenu) {
      var navMenuToggle = navMenu.querySelector('.dropdown-toggle');
      navMenuToggle && navMenuToggle.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var open = navMenu.classList.toggle('open');
        navMenuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      document.addEventListener('click', function (e) {
        if (navMenu.classList.contains('open') && !navMenu.contains(e.target)) {
          navMenu.classList.remove('open');
          navMenuToggle && navMenuToggle.setAttribute('aria-expanded', 'false');
        }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && navMenu.classList.contains('open')) {
          navMenu.classList.remove('open');
          navMenuToggle && navMenuToggle.setAttribute('aria-expanded', 'false');
        }
      });
      navMenu.addEventListener('click', function (e) {
        if (e.target.closest('.dropdown-menu a')) {
          navMenu.classList.remove('open');
          navMenuToggle && navMenuToggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    /* Topics filter: live-filter sidebar list as user types */
    (function initTopicsFilter() {
      var filterInput = $1('#topics-filter');
      var topicsMenu = $1('#topics-menu');
      if (!filterInput || !topicsMenu) return;

      if (topicsMenu.dataset.sortByCount) {
        var allItem = topicsMenu.querySelector('li[data-topic-type="all"]');
        var items = Array.from(topicsMenu.querySelectorAll('li'))
          .filter(function (li) { return li.getAttribute('data-topic-type') !== 'all'; });
        items.sort(function (a, b) {
          return (parseInt(b.dataset.topicCount, 10) || 0) - (parseInt(a.dataset.topicCount, 10) || 0);
        });
        if (allItem) topicsMenu.appendChild(allItem);
        items.forEach(function (item) { topicsMenu.appendChild(item); });
      }

      filterInput.addEventListener('keyup', function () {
        var filterValue = this.value.toLowerCase();
        var lis = topicsMenu.querySelectorAll('li');
        lis.forEach(function (li) {
          if (li.getAttribute('data-topic-type') === 'all') {
            li.style.display = '';
            return;
          }
          var topicName = li.getAttribute('data-topic-name') || '';
          li.style.display = (topicName && topicName.indexOf(filterValue) > -1) ? '' : 'none';
        });

        var visibleCount = Array.from(topicsMenu.querySelectorAll('li')).filter(function (li) {
          return li.getAttribute('data-topic-type') !== 'all' && isVisible(li);
        }).length;

        var existing = $1('#topics-no-results');
        if (existing) existing.remove();

        if (visibleCount === 0 && filterValue !== '') {
          var p = document.createElement('p');
          p.id = 'topics-no-results';
          p.className = 'text-muted';
          p.style.padding = '10px';
          p.textContent = 'No topics found';
          topicsMenu.parentNode.insertBefore(p, topicsMenu.nextSibling);
        }
      });
    })();

    /* Back-to-top button: show after scrolling, smooth-scroll on click */
    var backToTop = $1('#back-to-top');
    if (backToTop) {
      var toggleBackToTop = function () {
        if (window.pageYOffset > 300) backToTop.classList.add('visible');
        else backToTop.classList.remove('visible');
      };
      window.addEventListener('scroll', toggleBackToTop, { passive: true });
      toggleBackToTop();
      backToTop.addEventListener('click', function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  });
})();
