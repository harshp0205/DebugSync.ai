// This script helps fix any hardcoded Socket.io references
(function() {
  // Wait for document to load
  document.addEventListener('DOMContentLoaded', function() {
    // Look for any script tags with hardcoded socket.io references to port 4040
    const scripts = document.querySelectorAll('script[src*="4040/socket.io"]');
    
    scripts.forEach(script => {
      // Replace hardcoded references with the current origin
      const newSrc = script.src.replace('http://localhost:4040/socket.io', '/socket.io');
      script.src = newSrc;
      console.log('Fixed Socket.io script reference:', newSrc);
    });
    
    // Also check for any other hardcoded references
    console.log('Checking for other hardcoded Socket.io references...');
    
    // This helps debug any connection issues
    window.__socketDebug = {
      checkConnection: function() {
        if (window.io) {
          console.log('Socket.io library loaded successfully');
        } else {
          console.error('Socket.io library not loaded');
        }
      }
    };
  });
})();
