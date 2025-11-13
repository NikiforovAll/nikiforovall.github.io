(function() {
    'use strict';

    // State management
    let searchIndex = null;
    let searchData = [];
    let isIndexLoaded = false;
    let isLoading = false;
    let selectedResultIndex = -1;
    let searchDebounceTimer = null;

    // DOM elements (initialized after DOM is ready)
    let $searchTrigger, $searchModal, $searchInput, $searchResults, $searchClose, $searchBackdrop;

    // Detect platform for keyboard shortcut display
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifierKey = isMac ? '⌘' : 'ctrl';

    /**
     * Initialize search functionality when DOM is ready
     */
    function init() {
        // Update modifier key in UI
        const $modifierKeyElement = document.getElementById('search-modifier');
        if ($modifierKeyElement) {
            $modifierKeyElement.textContent = modifierKey;
        }

        // Cache DOM elements
        $searchTrigger = $('#search-trigger');
        $searchModal = $('#search-modal');
        $searchInput = $('#search-input');
        $searchResults = $('#search-results');
        $searchClose = $('#search-close');
        $searchBackdrop = $('.search-backdrop');

        // Set up event listeners
        setupEventListeners();
    }

    /**
     * Set up all event listeners
     */
    function setupEventListeners() {
        // Open modal on trigger click
        $searchTrigger.on('click', openModal);

        // Close modal handlers
        $searchClose.on('click', closeModal);
        $searchBackdrop.on('click', function(e) {
            // Only close if clicking directly on the backdrop, not on bubbled events
            if (e.target === this) {
                closeModal();
            }
        });

        // Search input handler with debouncing
        $searchInput.on('input', function() {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(performSearch, 150);
        });

        // Global keyboard shortcut: Ctrl+K / Cmd+K
        $(document).on('keydown', function(e) {
            // Check for Ctrl+K (Windows/Linux) or Cmd+K (Mac)
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                openModal();
                return false;
            }

            // Only handle other keys when modal is open
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
                    e.preventDefault();
                    selectResult();
                    break;
            }
        });

        // Result item click handler (using event delegation)
        $searchResults.on('click', '.search-result-item', function() {
            const url = $(this).data('url');
            if (url) {
                window.location.href = url;
            }
        });

        // Result item hover handler (update selection)
        $searchResults.on('mouseenter', '.search-result-item', function() {
            const index = $(this).data('index');
            setSelectedResult(index);
        });
    }

    /**
     * Open search modal
     */
    function openModal() {
        $searchModal.addClass('open');
        setTimeout(function() {
            $searchInput.focus();
        }, 50);

        // Load search index on first open
        if (!isIndexLoaded && !isLoading) {
            loadSearchIndex();
        }
    }

    /**
     * Close search modal
     */
    function closeModal() {
        $searchModal.removeClass('open');
        $searchInput.val('');
        $searchResults.html('<div class="search-hint">Type at least 2 characters to search...</div>');
        selectedResultIndex = -1;
    }

    /**
     * Check if modal is currently open
     */
    function isModalOpen() {
        return $searchModal.is(':visible');
    }

    /**
     * Load and build search index from search.json
     */
    function loadSearchIndex() {
        if (isLoading || isIndexLoaded) return;

        isLoading = true;
        $searchResults.html('<div class="search-loading"><i class="fa fa-spinner fa-spin"></i> Loading search index...</div>');

        $.ajax({
            url: window.location.origin + '/search.json',
            dataType: 'json',
            success: function(data) {
                searchData = data;
                buildSearchIndex(data);
                isIndexLoaded = true;
                isLoading = false;
                $searchResults.html('<div class="search-hint">Type at least 2 characters to search...</div>');
            },
            error: function(xhr, status, error) {
                isLoading = false;
                $searchResults.html('<div class="search-no-results"><i class="fa fa-exclamation-triangle"></i><br>Failed to load search index.<br>Please try again later.</div>');
                console.error('Failed to load search index:', error);
            }
        });
    }

    /**
     * Build lunr search index
     */
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

    /**
     * Perform search with current input value
     */
    function performSearch() {
        const query = $searchInput.val().trim();

        // Reset selection
        selectedResultIndex = -1;

        // Check minimum query length
        if (query.length < 2) {
            $searchResults.html('<div class="search-hint">Type at least 2 characters to search...</div>');
            return;
        }

        // Check if index is loaded
        if (!isIndexLoaded) {
            $searchResults.html('<div class="search-loading"><i class="fa fa-spinner fa-spin"></i> Loading search index...</div>');
            return;
        }

        // Perform search
        try {
            const results = searchIndex.search(query + '~1'); // Fuzzy search with edit distance 1
            displayResults(results, query);
        } catch (error) {
            console.error('Search error:', error);
            // Fallback to exact search
            try {
                const results = searchIndex.search(query);
                displayResults(results, query);
            } catch (fallbackError) {
                $searchResults.html('<div class="search-no-results">Invalid search query. Please try different keywords.</div>');
            }
        }
    }

    /**
     * Display search results
     */
    function displayResults(results, query) {
        if (results.length === 0) {
            $searchResults.html('<div class="search-no-results"><i class="fa fa-search"></i><br>No results found for "<strong>' + escapeHtml(query) + '</strong>"</div>');
            return;
        }

        const $container = $('<div></div>');
        const queryTerms = query.toLowerCase().split(/\s+/);

        // Limit to top 10 results
        results.slice(0, 10).forEach(function(result, index) {
            const item = searchData[parseInt(result.ref)];
            const $resultItem = createResultItem(item, index, queryTerms);
            $container.append($resultItem);
        });

        $searchResults.html($container);
    }

    /**
     * Create a single result item element
     */
    function createResultItem(item, index, queryTerms) {
        const $item = $('<div class="search-result-item"></div>');
        $item.attr('data-index', index);
        $item.attr('data-url', item.url);

        // Title with highlighting
        const $title = $('<div class="search-result-title"></div>');
        $title.html(
            '<i class="fa fa-file-text-o search-result-icon"></i>' +
            highlightText(item.title, queryTerms)
        );

        // Snippet with highlighting
        const snippet = item.shortinfo || item.content.substring(0, 150);
        const $snippet = $('<div class="search-result-snippet"></div>');
        $snippet.html(highlightText(snippet, queryTerms) + '...');

        // Metadata (date, tags, categories)
        const $meta = $('<div class="search-result-meta"></div>');

        const $date = $('<span class="search-result-date"></span>');
        $date.html('<i class="fa fa-calendar"></i> ' + item.date);

        const tags = Array.isArray(item.tags) ? item.tags.join(', ') : item.tags;
        const categories = Array.isArray(item.categories) ? item.categories.join(', ') : item.categories;
        const combinedTags = [categories, tags].filter(Boolean).join(' · ');

        const $tags = $('<span class="search-result-tags"></span>');
        $tags.html('<i class="fa fa-tags"></i> ' + escapeHtml(combinedTags));

        $meta.append($date);
        if (combinedTags) {
            $meta.append($tags);
        }

        $item.append($title);
        $item.append($snippet);
        $item.append($meta);

        return $item;
    }

    /**
     * Highlight query terms in text
     */
    function highlightText(text, queryTerms) {
        let highlighted = escapeHtml(text);
        queryTerms.forEach(function(term) {
            if (term.length < 2) return;
            const regex = new RegExp('(' + escapeRegex(term) + ')', 'gi');
            highlighted = highlighted.replace(regex, '<span class="search-highlight">$1</span>');
        });
        return highlighted;
    }

    /**
     * Navigate results with arrow keys
     */
    function navigateResults(direction) {
        const $results = $('.search-result-item');
        if ($results.length === 0) return;

        let newIndex = selectedResultIndex + direction;

        // Wrap around
        if (newIndex < 0) {
            newIndex = $results.length - 1;
        } else if (newIndex >= $results.length) {
            newIndex = 0;
        }

        setSelectedResult(newIndex);
        scrollToSelectedResult();
    }

    /**
     * Set selected result by index
     */
    function setSelectedResult(index) {
        $('.search-result-item').removeClass('selected');
        selectedResultIndex = index;
        $('.search-result-item').eq(index).addClass('selected');
    }

    /**
     * Scroll to selected result
     */
    function scrollToSelectedResult() {
        const $selected = $('.search-result-item.selected');
        if ($selected.length === 0) return;

        const container = $searchResults[0];
        const element = $selected[0];
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        const elementTop = element.offsetTop;
        const elementBottom = elementTop + element.offsetHeight;

        if (elementTop < containerTop) {
            container.scrollTop = elementTop;
        } else if (elementBottom > containerBottom) {
            container.scrollTop = elementBottom - container.clientHeight;
        }
    }

    /**
     * Select current result and navigate to it
     */
    function selectResult() {
        const $selected = $('.search-result-item.selected');
        if ($selected.length > 0) {
            const url = $selected.data('url');
            if (url) {
                window.location.href = url;
            }
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Escape regex special characters
     */
    function escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Initialize when document is ready
    $(document).ready(init);

})();
