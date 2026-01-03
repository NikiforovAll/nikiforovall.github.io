/**
 * Copy Code Blocks - Adds copy buttons to code blocks
 * Works with Jekyll + Rouge highlighter and plain code blocks
 * 
 * Features:
 * - Adds "Copy" button to all multi-line code blocks (highlighted and plain)
 * - Shows button on hover (always visible on touch devices)
 * - Uses modern Clipboard API
 * - Provides visual feedback ("Copied!" for 2 seconds)
 */
(function() {
  'use strict';

  function createCopyButton(container, codeElement) {
    // Create copy button
    const button = document.createElement('button');
    button.className = 'copy-code-button';
    button.type = 'button';
    button.setAttribute('aria-label', 'Copy code to clipboard');
    button.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
    
    // Click handler
    button.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Extract text content
      const text = codeElement.innerText;
      
      // Copy to clipboard using modern API
      navigator.clipboard.writeText(text).then(function() {
        // Success feedback
        button.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        button.classList.add('copied');
        
        // Revert after 2 seconds
        setTimeout(function() {
          button.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
          button.classList.remove('copied');
        }, 2000);
      }).catch(function(err) {
        // Error handling (e.g., HTTP context, permissions)
        console.error('Failed to copy code:', err);
        button.innerHTML = '<i class="fa-solid fa-xmark"></i> Error';
        
        setTimeout(function() {
          button.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
        }, 2000);
      });
    });
    
    return button;
  }

  document.addEventListener('DOMContentLoaded', function() {
    // 1. Target all Rouge-generated code blocks (div.highlighter-rouge)
    const highlightedBlocks = document.querySelectorAll('div.highlighter-rouge');
    
    highlightedBlocks.forEach(function(block) {
      const code = block.querySelector('pre code');
      if (!code) return;
      
      // Make container position relative for absolute button positioning
      block.style.position = 'relative';
      
      // Create and insert button
      const button = createCopyButton(block, code);
      block.appendChild(button);
    });
    
    // 2. Target plain <pre> blocks (not inside highlighter-rouge)
    const allPreElements = document.querySelectorAll('pre');
    
    allPreElements.forEach(function(pre) {
      // Skip if already inside a highlighter-rouge container
      if (pre.closest('div.highlighter-rouge')) return;
      
      // Skip if it's an inline code element (very short)
      const text = pre.textContent || '';
      if (text.trim().length < 10) return;
      
      // Wrap in a container if not already in one
      let container = pre.parentElement;
      
      // If parent is just article/div without positioning, wrap it
      if (!container.style.position) {
        const wrapper = document.createElement('div');
        wrapper.className = 'plain-code-block';
        wrapper.style.position = 'relative';
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);
        container = wrapper;
      } else {
        container.style.position = 'relative';
      }
      
      // Create and insert button
      const button = createCopyButton(container, pre);
      container.appendChild(button);
    });
  });
})();
