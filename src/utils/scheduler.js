const scraperService = require('../services/scraper');

// Iniciar el monitoreo
scraperService.startMonitoring().catch(console.error);