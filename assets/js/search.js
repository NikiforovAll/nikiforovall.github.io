(function() {
    'use strict';

    let searchIndex = null;
    let searchData = [];
    let isIndexLoaded = false;
    let isLoading = false;
    let selectedResultIndex = -1;
    let searchDebounceTimer = null;

    let searchTrigger, searchModal, searchInput, searchResults, searchClose, searchBackdrop;

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifierKey = isMac ? '⌘' : 'ctrl';

    function ready(fn) {
        if (document.readyState !== 'loading') fn();
        else document.addEventListener('DOMContentLoaded', fn);
    }

    function init() {
        const modifierKeyElement = document.getElementById('search-modifier');
        if (modifierKeyElement) {
            modifierKeyElement.textContent = modifierKey;
        }

        searchTrigger = document.getElementById('search-trigger');
        searchModal = document.getElementById('search-modal');
        searchInput = document.getElementById('search-input');
        searchResults = document.getElementById('search-results');
        searchClose = document.getElementById('search-close');
        searchBackdrop = document.querySelector('.search-backdrop');

        setupEventListeners();
    }

    function setupEventListeners() {
        if (searchTrigger) searchTrigger.addEventListener('click', openModal);

        if (searchClose) searchClose.addEventListener('click', closeModal);
        if (searchBackdrop) {
            searchBackdrop.addEventListener('click', function(e) {
                if (e.target === this) {
                    closeModal();
                }
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', function() {
                clearTimeout(searchDebounceTimer);
                searchDebounceTimer = setTimeout(performSearch, 150);
            });

            searchInput.addEventListener('focus', function() {
                if (!isIndexLoaded && !isLoading) {
                    loadSearchIndex();
                }
            });
        }

        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                openModal();
                return false;
            }

            if (!isModalOpen()) return;

            switch(e.key) {
                case 'Escape':
                    e.preventDefault();
                    closeModal();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    navigateResults(1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    navigateResults(-1);
                    break;
                case 'Enter':
                    if (document.activeElement && document.activeElement.id === 'search-close') {
                        return;
                    }
                    e.preventDefault();
                    selectResult();
                    break;
            }
        });

        if (searchResults) {
            searchResults.addEventListener('click', function(e) {
                const item = e.target.closest('.search-result-item');
                if (!item || !searchResults.contains(item)) return;
                const url = item.getAttribute('data-url');
                if (url) {
                    window.location.href = url;
                }
            });

            searchResults.addEventListener('mouseover', function(e) {
                const item = e.target.closest('.search-result-item');
                if (!item || !searchResults.contains(item)) return;
                if (item._searchHovered) return;
                item._searchHovered = true;
                const index = parseInt(item.getAttribute('data-index'), 10);
                setSelectedResult(index);
            });

            searchResults.addEventListener('mouseout', function(e) {
                const item = e.target.closest('.search-result-item');
                if (item) item._searchHovered = false;
            });
        }
    }

    function openModal() {
        if (!searchModal) return;
        searchModal.classList.add('open');
        setTimeout(function() {
            if (searchInput) searchInput.focus();
        }, 50);

        if (!isIndexLoaded && !isLoading) {
            loadSearchIndex();
        }
    }

    function closeModal() {
        if (!searchModal) return;
        searchModal.classList.remove('open');
        if (searchInput) searchInput.value = '';
        if (searchResults) searchResults.innerHTML = '<div class="search-hint">Type at least 2 characters to search...</div>';
        selectedResultIndex = -1;
    }

    function isModalOpen() {
        return searchModal && searchModal.classList.contains('open');
    }

    let lunrPromise = null;
    function loadLunr() {
        if (window.lunr) return Promise.resolve(window.lunr);
        if (lunrPromise) return lunrPromise;
        lunrPromise = new Promise(function(resolve, reject) {
            const s = document.createElement('script');
            s.src = 'https://unpkg.com/lunr@2.3.9/lunr.min.js';
            s.async = true;
            s.onload = function() { resolve(window.lunr); };
            s.onerror = function() { reject(new Error('Failed to load lunr.js')); };
            document.head.appendChild(s);
        });
        return lunrPromise;
    }

    function loadSearchIndex() {
        if (isLoading || isIndexLoaded) return;

        isLoading = true;
        if (searchResults) searchResults.innerHTML = '<div class="search-loading"><i class="fa fa-spinner fa-spin"></i> Loading search index...</div>';

        const dataPromise = fetch(window.location.origin + '/search.json').then(function(r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        });

        Promise.all([loadLunr(), dataPromise]).then(function(results) {
            const data = results[1];
            searchData = data;
            buildSearchIndex(data);
            isIndexLoaded = true;
            isLoading = false;
            if (searchResults) searchResults.innerHTML = '<div class="search-hint">Type at least 2 characters to search...</div>';
        }).catch(function(error) {
            isLoading = false;
            if (searchResults) searchResults.innerHTML = '<div class="search-no-results"><i class="fa fa-exclamation-triangle"></i><br>Failed to load search index.<br>Please try again later.</div>';
            console.error('Failed to load search index:', error);
        });
    }

    function buildSearchIndex(data) {
        searchIndex = lunr(function() {
            this.ref('id');
            this.field('title', { boost: 10 });
            this.field('categories', { boost: 5 });
            this.field('tags', { boost: 5 });
            this.field('shortinfo', { boost: 3 });
            this.field('content');

            data.forEach(function(doc) {
                this.add(doc);
            }, this);
        });
    }

    function performSearch() {
        const query = (searchInput ? searchInput.value : '').trim();

        selectedResultIndex = -1;

        if (query.length < 2) {
            if (searchResults) searchResults.innerHTML = '<div class="search-hint">Type at least 2 characters to search...</div>';
            return;
        }

        if (!isIndexLoaded) {
            if (searchResults) searchResults.innerHTML = '<div class="search-loading"><i class="fa fa-spinner fa-spin"></i> Loading search index...</div>';
            return;
        }

        try {
            const results = searchIndex.search(query + '~1');
            displayResults(results, query);
        } catch (error) {
            console.error('Search error:', error);
            try {
                const results = searchIndex.search(query);
                displayResults(results, query);
            } catch (fallbackError) {
                if (searchResults) searchResults.innerHTML = '<div class="search-no-results">Invalid search query. Please try different keywords.</div>';
            }
        }
    }

    function displayResults(results, query) {
        if (!searchResults) return;

        if (results.length === 0) {
            searchResults.innerHTML = '<div class="search-no-results"><i class="fa fa-search"></i><br>No results found for "<strong>' + escapeHtml(query) + '</strong>"</div>';
            return;
        }

        const container = document.createElement('div');
        const queryTerms = query.toLowerCase().split(/\s+/);

        results.slice(0, 10).forEach(function(result, index) {
            const item = searchData[parseInt(result.ref)];
            const resultItem = createResultItem(item, index, queryTerms);
            container.appendChild(resultItem);
        });

        searchResults.innerHTML = '';
        searchResults.appendChild(container);
    }

    function createResultItem(item, index, queryTerms) {
        const el = document.createElement('div');
        el.className = 'search-result-item';
        el.setAttribute('data-index', index);
        el.setAttribute('data-url', item.url);

        const title = document.createElement('div');
        title.className = 'search-result-title';
        title.innerHTML = '<i class="fa fa-file-text-o search-result-icon"></i>' + highlightText(item.title, queryTerms);

        const snippetText = item.shortinfo || item.content.substring(0, 150);
        const snippet = document.createElement('div');
        snippet.className = 'search-result-snippet';
        snippet.innerHTML = highlightText(snippetText, queryTerms) + '...';

        const meta = document.createElement('div');
        meta.className = 'search-result-meta';

        const date = document.createElement('span');
        date.className = 'search-result-date';
        date.innerHTML = '<i class="fa fa-calendar"></i> ' + item.date;

        const tagsStr = Array.isArray(item.tags) ? item.tags.join(', ') : item.tags;
        const categoriesStr = Array.isArray(item.categories) ? item.categories.join(', ') : item.categories;
        const combinedTags = [categoriesStr, tagsStr].filter(Boolean).join(' · ');

        meta.appendChild(date);
        if (combinedTags) {
            const tagsEl = document.createElement('span');
            tagsEl.className = 'search-result-tags';
            tagsEl.innerHTML = '<i class="fa fa-tags"></i> ' + escapeHtml(combinedTags);
            meta.appendChild(tagsEl);
        }

        el.appendChild(title);
        el.appendChild(snippet);
        el.appendChild(meta);

        return el;
    }

    function highlightText(text, queryTerms) {
        let highlighted = escapeHtml(text);
        queryTerms.forEach(function(term) {
            if (term.length < 2) return;
            const regex = new RegExp('(' + escapeRegex(term) + ')', 'gi');
            highlighted = highlighted.replace(regex, '<span class="search-highlight">$1</span>');
        });
        return highlighted;
    }

    function navigateResults(direction) {
        const items = document.querySelectorAll('.search-result-item');
        if (items.length === 0) return;

        let newIndex = selectedResultIndex + direction;

        if (newIndex < 0) {
            newIndex = items.length - 1;
        } else if (newIndex >= items.length) {
            newIndex = 0;
        }

        setSelectedResult(newIndex);
        scrollToSelectedResult();
    }

    function setSelectedResult(index) {
        const items = document.querySelectorAll('.search-result-item');
        items.forEach(function(it) { it.classList.remove('selected'); });
        selectedResultIndex = index;
        if (items[index]) items[index].classList.add('selected');
    }

    function scrollToSelectedResult() {
        const selected = document.querySelector('.search-result-item.selected');
        if (!selected || !searchResults) return;

        const container = searchResults;
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        const elementTop = selected.offsetTop;
        const elementBottom = elementTop + selected.offsetHeight;

        if (elementTop < containerTop) {
            container.scrollTop = elementTop;
        } else if (elementBottom > containerBottom) {
            container.scrollTop = elementBottom - container.clientHeight;
        }
    }

    function selectResult() {
        const selected = document.querySelector('.search-result-item.selected');
        if (selected) {
            const url = selected.getAttribute('data-url');
            if (url) {
                window.location.href = url;
            }
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    ready(init);

})();
