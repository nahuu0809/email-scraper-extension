// popup.js

// 🔧 CONFIGURACIÓN HARDCODEADA
const HARDCODED_PATHS = [
  '', // Página principal
  '/contacto',
  '/trabaja-con-nosotros',
  '/empleo',
  '/careers',
  '/jobs',
  '/talento',
  '/rrhh',
  '/seleccion',
  '/people',
  '/recursos-humanos',
  '/sumate',
  '/postulate',
  '/trabajar',
  '/unirse',
  '/equipo',
  '/vacantes',
  '/oportunidades',
  '/hr',
  '/human-resources',
  '/join-us',
  '/work-with-us',
  '/employment',
  '/opportunities',
  "/sitio_de_carrera",
  "/empleos",
  "/carreras",
  "/carrera",
  "/trabajo",
  "/trabaja",
  "/sumate-a-nuestro-equipo",
  "/forma-parte-de-nuestro-equipo",
  "/career",
  "/sumate-al-equipo",
  "/trabajá-con-nosotros",
  "/enviar-cv",
  "/jst/enviar-cv",
  "/dejanos-tu-cv",
  "/talent",
  "/nosotros",
  "/apply",
  "/aplicar",
  "/sumarse",
  "/trabajo-con-nosotros",
  "/busquedas"
];

const HARDCODED_KEYWORDS = 'rrhh|talent|people|jobs|careers|empleo|hr|recruiting|recursos.humanos|seleccion|talento|trabajar|human.resources|recruitment|hiring|vacantes|oportunidades';

document.addEventListener('DOMContentLoaded', function() {
  const startButton = document.getElementById('startScraping');
  const currentPageButton = document.getElementById('scrapeCurrentPage');
  const stopButton = document.getElementById('stopSearch');
  const resultsDiv = document.getElementById('results');
  const loadingDiv = document.getElementById('loading');
  const emailListDiv = document.getElementById('emailList');
  const progressDiv = document.getElementById('progress');
  const statsDiv = document.getElementById('stats');
  const searchStatusDiv = document.getElementById('searchStatus');
  const statusTextDiv = document.getElementById('statusText');

  let isSearching = false;
  let searchController = null;

  // Cargar configuración y estado persistente
  loadSettings();
  checkSearchStatus();

  startButton.addEventListener('click', startScraping);
  currentPageButton.addEventListener('click', scrapeCurrentPage);
  stopButton.addEventListener('click', stopSearch);

  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['baseUrl']);
      if (result.baseUrl) document.getElementById('baseUrl').value = result.baseUrl;
    } catch (error) {
      console.log('No se pudieron cargar las configuraciones');
    }
  }

  async function saveSettings() {
    const settings = {
      baseUrl: document.getElementById('baseUrl').value
    };
    await chrome.storage.sync.set(settings);
  }

  async function checkSearchStatus() {
    try {
      const result = await chrome.storage.local.get(['isSearching', 'searchProgress']);
      if (result.isSearching) {
        isSearching = true;
        searchStatusDiv.style.display = 'block';
        startButton.disabled = true;
        currentPageButton.disabled = true;
        
        if (result.searchProgress) {
          statusTextDiv.textContent = result.searchProgress;
        } else {
          statusTextDiv.textContent = '🔄 Búsqueda en progreso...';
        }
      }
    } catch (error) {
      console.log('No se pudo verificar el estado de búsqueda');
    }
  }

  async function updateSearchStatus(progress) {
    await chrome.storage.local.set({ 
      isSearching: isSearching, 
      searchProgress: progress 
    });
    
    if (isSearching) {
      statusTextDiv.textContent = progress;
    }
  }

  async function stopSearch() {
    isSearching = false;
    if (searchController) {
      searchController.abort();
    }
    
    await chrome.storage.local.remove(['isSearching', 'searchProgress']);
    
    searchStatusDiv.style.display = 'none';
    startButton.disabled = false;
    currentPageButton.disabled = false;
    loadingDiv.style.display = 'none';
  }

  async function startScraping() {
    if (isSearching) {
      alert('Ya hay una búsqueda en progreso');
      return;
    }

    await saveSettings();
    
    const baseUrl = document.getElementById('baseUrl').value.trim();

    if (!baseUrl) {
      alert('Por favor ingresa una URL del sitio web');
      return;
    }

    // Iniciar búsqueda persistente
    isSearching = true;
    searchController = new AbortController();
    
    startButton.disabled = true;
    currentPageButton.disabled = true;
    searchStatusDiv.style.display = 'block';
    resultsDiv.style.display = 'block';
    loadingDiv.style.display = 'block';
    emailListDiv.innerHTML = '';
    statsDiv.innerHTML = '';

    await updateSearchStatus('🚀 Iniciando búsqueda...');

    try {
      const results = await scrapeMultiplePages(baseUrl, HARDCODED_PATHS, HARDCODED_KEYWORDS);
      displayResults(results);
      await updateSearchStatus(`✅ Búsqueda completada - ${results.allEmails.length} emails encontrados`);
    } catch (error) {
      if (error.name !== 'AbortError') {
        emailListDiv.innerHTML = `<div style="color: #ff6b6b;">❌ Error: ${error.message}</div>`;
        await updateSearchStatus(`❌ Error en la búsqueda`);
      }
    } finally {
      if (!searchController?.signal.aborted) {
        await stopSearch();
      }
    }
  }

  async function scrapeCurrentPage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      currentPageButton.disabled = true;
      resultsDiv.style.display = 'block';
      loadingDiv.style.display = 'block';
      loadingDiv.innerHTML = '<div>🔄 Analizando página actual...</div>';

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: extractEmailsFromCurrentPage
      });

      const emails = results[0].result;
      
      displayResults({
        allEmails: emails,
        filteredEmails: filterEmails(emails, HARDCODED_KEYWORDS),
        successfulRequests: 1,
        totalRequests: 1
      });

    } catch (error) {
      emailListDiv.innerHTML = `<div style="color: #ff6b6b;">❌ Error: ${error.message}</div>`;
    } finally {
      loadingDiv.style.display = 'none';
      currentPageButton.disabled = false;
    }
  }

  async function scrapeMultiplePages(baseUrl, paths, keywordsText) {
    const allEmails = new Set();
    let successfulRequests = 0;

    for (let i = 0; i < paths.length && isSearching; i++) {
      const path = paths[i];
      const url = baseUrl + path;
      
      const progressText = `📄 [${i + 1}/${paths.length}] ${url}`;
      progressDiv.innerHTML = progressText;
      await updateSearchStatus(progressText);
      
      try {
        const emails = await fetchPageEmails(url);
        emails.forEach(email => allEmails.add(email));
        successfulRequests++;
        
        // Delay entre requests
        if (i < paths.length - 1 && isSearching) {
          await new Promise((resolve, reject) => {
            const timeoutId = setTimeout(resolve, 2000);
            searchController.signal.addEventListener('abort', () => {
              clearTimeout(timeoutId);
              reject(new Error('Search aborted'));
            });
          });
        }
        
      } catch (error) {
        if (error.message === 'Search aborted') {
          throw new Error('Búsqueda detenida por el usuario');
        }
        console.warn(`Error en ${url}:`, error.message);
      }
    }

    const allEmailsArray = Array.from(allEmails);
    const filteredEmails = filterEmails(allEmailsArray, keywordsText);

    return {
      allEmails: allEmailsArray,
      filteredEmails: filteredEmails,
      successfulRequests: successfulRequests,
      totalRequests: paths.length
    };
  }

  async function fetchPageEmails(url) {
    // Verificar si la búsqueda fue detenida
    if (!isSearching || searchController?.signal.aborted) {
      throw new Error('Search aborted');
    }

    try {
      const response = await fetch(url, { 
        signal: searchController.signal 
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const html = await response.text();
      return extractEmailsFromHTML(html);
    } catch (error) {
      if (error.name === 'AbortError' || error.message === 'Search aborted') {
        throw new Error('Search aborted');
      }
      
      // Si hay CORS, intentar con content script
      try {
        const [tab] = await chrome.tabs.create({ url: url, active: false });
        await new Promise(resolve => setTimeout(resolve, 3000)); // Esperar carga
        
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: extractEmailsFromCurrentPage
        });
        
        chrome.tabs.remove(tab.id); // Cerrar tab
        return results[0].result;
      } catch (tabError) {
        throw new Error(`No se pudo acceder a ${url}`);
      }
    }
  }

  function extractEmailsFromHTML(html) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const matches = html.match(emailRegex) || [];
    return [...new Set(matches)]; // Eliminar duplicados
  }

  // Esta función se ejecuta en el contexto de la página
  function extractEmailsFromCurrentPage() {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const text = document.body.innerText || document.body.textContent || '';
    const matches = text.match(emailRegex) || [];
    return [...new Set(matches)];
  }

  function filterEmails(emails, keywordsText) {
    if (!keywordsText.trim()) return [];
    
    const keywordRegex = new RegExp(`(${keywordsText})`, 'i');
    return emails.filter(email => keywordRegex.test(email));
  }

  function displayResults(results) {
    const { allEmails, filteredEmails, successfulRequests, totalRequests } = results;

    // Stats
    statsDiv.innerHTML = `
      <div>✅ ${successfulRequests}/${totalRequests} páginas</div>
      <div>📧 ${allEmails.length} emails únicos</div>
      <div>🎯 ${filteredEmails.length} emails RRHH</div>
    `;

    // Emails filtrados primero
    let html = '';
    if (filteredEmails.length > 0) {
      html += '<div style="color: #4CAF50; font-weight: bold; margin-bottom: 10px;">🎯 EMAILS DE RECURSOS HUMANOS:</div>';
      filteredEmails.forEach(email => {
        html += `<div class="email" style="background: rgba(76, 175, 80, 0.3);">⭐ ${email}</div>`;
      });
      html += '<br>';
    }

    // Todos los emails
    if (allEmails.length > 0) {
      html += '<div style="color: #2196F3; font-weight: bold; margin-bottom: 10px;">📧 TODOS LOS EMAILS ENCONTRADOS:</div>';
      allEmails.forEach(email => {
        if (!filteredEmails.includes(email)) {
          html += `<div class="email">${email}</div>`;
        }
      });
    } else {
      html += '<div style="color: #ff6b6b;">❌ No se encontraron emails</div>';
      html += '<div style="color: #999; font-size: 11px; margin-top: 5px;">💡 El sitio podría usar JavaScript para cargar el contenido o tener emails en imágenes</div>';
    }

    emailListDiv.innerHTML = html;
  }

  // Funciones auxiliares
  function extractEmailsFromHTML(html) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const matches = html.match(emailRegex) || [];
    return [...new Set(matches)]; // Eliminar duplicados
  }

  function filterEmails(emails, keywordsText) {
    if (!keywordsText.trim()) return [];
    
    const keywordRegex = new RegExp(`(${keywordsText})`, 'i');
    return emails.filter(email => keywordRegex.test(email));
  }
});

// Esta función se ejecuta en el contexto de la página
function extractEmailsFromCurrentPage() {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const text = document.body.innerText || document.body.textContent || '';
  const matches = text.match(emailRegex) || [];
  return [...new Set(matches)];
}