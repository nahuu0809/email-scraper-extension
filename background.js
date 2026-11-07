// background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log('📧 Email Scraper Pro instalado correctamente');
});

// Manejar clics en el icono de la extensión
chrome.action.onClicked.addListener((tab) => {
  // El popup ya maneja la funcionalidad
});

// Escuchar mensajes del popup o content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrapeEmails') {
    // Lógica adicional si es necesaria
    sendResponse({ success: true });
  }
});