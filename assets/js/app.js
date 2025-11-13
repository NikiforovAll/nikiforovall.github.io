(function($) {

 function init() {
    /* Sidebar height set */
    $sidebarStyles = $('.sidebar').attr('style') || "";
    $sidebarStyles += ' min-height: ' + $(document).height() + 'px;';
    $('.sidebar').attr('style', $sidebarStyles);

    /* Secondary contact links */
    var $scontacts = $('#contact-list-secondary');
    var $contactList = $('#contact-list');

    $scontacts.hide();
    $contactList.mouseenter(function(){ $scontacts.fadeIn(); });
    $contactList.mouseleave(function(){ $scontacts.fadeOut(); });

    /**
     * Tags & categories tab activation based on hash value. If hash is undefined then first tab is activated.
     */
    function activateTab() {
      if(['/tags.html', '/categories.html', '/topics.html'].indexOf(window.location.pathname) > -1) {
        var hash = window.location.hash;
        if(hash)
          $('.tab-pane').length && $('a[href="' + hash + '"]').tab('show');
        else
          $('.tab-pane').length && $($('.cat-tag-menu li a')[0]).tab('show');
      }
    }

    // watch hash change and activate relevant tab
    $(window).on('hashchange', activateTab);

    // initial activation
    activateTab();

    /**
     * Topics filter functionality - filters the list of topics as user types
     */
    function initTopicsFilter() {
      var $filterInput = $('#topics-filter');
      var $topicsMenu = $('#topics-menu');

      if($filterInput.length === 0) return;

      // Sort topics by count (descending) on page load
      if($topicsMenu.data('sort-by-count')) {
        // Separate "All" item from regular topics
        var $allItem = $topicsMenu.find('li[data-topic-type="all"]');
        var $items = $topicsMenu.find('li').not('[data-topic-type="all"]').get();

        $items.sort(function(a, b) {
          var countA = parseInt($(a).data('topic-count')) || 0;
          var countB = parseInt($(b).data('topic-count')) || 0;
          return countB - countA; // Descending order (highest first)
        });

        // Re-append "All" first, then sorted items
        if($allItem.length) {
          $topicsMenu.append($allItem);
        }
        $.each($items, function(index, item) {
          $topicsMenu.append(item);
        });
      }

      $filterInput.on('keyup', function() {
        var filterValue = $(this).val().toLowerCase();

        $topicsMenu.find('li').each(function() {
          var $li = $(this);
          var topicName = $li.data('topic-name');
          var topicType = $li.data('topic-type');

          // Always show "All" option
          if(topicType === 'all') {
            $li.show();
            return;
          }

          if(topicName && topicName.indexOf(filterValue) > -1) {
            $li.show();
          } else {
            $li.hide();
          }
        });

        // If all regular items are hidden (excluding "All"), show a "no results" message
        var visibleCount = $topicsMenu.find('li:visible').not('[data-topic-type="all"]').length;
        $('#topics-no-results').remove();

        if(visibleCount === 0 && filterValue !== '') {
          $topicsMenu.after('<p id="topics-no-results" class="text-muted" style="padding: 10px;">No topics found</p>');
        }
      });
    }

    // Initialize topics filter
    initTopicsFilter();
  };

  // run init on document ready
  $(document).ready(init);

})(jQuery);