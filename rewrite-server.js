const rewriterService = require('./src/services/reescritura');

process.on('SIGINT', async () => {
    console.log('\nCerrando servicio de reescritura...');
    process.exit();
});

rewriterService.start();