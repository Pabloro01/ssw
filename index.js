// Load environment variables first, before any other imports
const path = require('path');
const result = require('dotenv').config({ path: path.join(__dirname, '.env') });
if (result.error) {
    console.error('Error loading .env file:', result.error);
    process.exit(1);
}

console.log('Environment check - OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);

const express = require('express');
const cors = require('cors');
const Database = require('./src/config/database');
const ScraperService = require('./src/services/scraper');
const RewriteService = require('./src/services/reescritura');
const SocialRewriteService = require('./src/services/socialRewrite');
const OpenAI = require('openai');

const app = express();
app.use(express.json());

// Configuración de CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Configurar OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Inicializar la base de datos
const database = new Database();

// Inicializar servicios
const scraperService = new ScraperService(database);
const rewriteService = new RewriteService(database, process.env.OPENAI_API_KEY);
const socialRewriteService = new SocialRewriteService(database, process.env.OPENAI_API_KEY);

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rutas API
app.get('/api/news', async (req, res) => {
    try {
        const news = await database.getLastFiveNews();
        res.json({ status: 'success', data: news });
    } catch (error) {
        console.error('Error al obtener noticias:', error);
        res.status(500).json({ status: 'error', message: 'Error al obtener noticias' });
    }
});

app.get('/api/rewritten-news/latest', async (req, res) => {
    try {
        const news = await database.getLastFiveRewrittenNews();
        res.json({ status: 'success', data: news });
    } catch (error) {
        console.error('Error al obtener noticias reescritas:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Error al obtener noticias reescritas',
            details: error.message 
        });
    }
});

app.get('/api/social-news/latest', async (req, res) => {
    try {
        const news = await database.getLastFiveSocialNews();
        res.json({ status: 'success', data: news });
    } catch (error) {
        console.error('Error al obtener noticias sociales:', error);
        res.status(500).json({ status: 'error', message: 'Error al obtener noticias sociales' });
    }
});

// Ruta para obtener la configuración actual
app.get('/api/config', async (req, res) => {
    try {
        const config = await database.getConfig();
        res.json({ status: 'success', data: config });
    } catch (error) {
        console.error('Error al obtener configuración:', error);
        res.status(500).json({ status: 'error', message: 'Error al obtener configuración' });
    }
});

// Nueva ruta para obtener historial de configuraciones
app.get('/api/config/history', async (req, res) => {
    try {
        const history = await database.getConfigHistory();
        res.json({ 
            status: 'success', 
            data: history.map(config => ({
                ...config,
                created_at: new Date(config.created_at).toLocaleString()
            }))
        });
    } catch (error) {
        console.error('Error al obtener historial de configuración:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Error al obtener historial de configuración' 
        });
    }
});

// Ruta para actualizar la configuración de reescritura
app.post('/api/config/rewrite', async (req, res) => {
    try {
        await database.saveConfig({
            rewrite_model: req.body.rewrite_model,
            rewrite_temperature: req.body.rewrite_temperature,
            rewrite_prompt: req.body.rewrite_prompt
        });
        res.json({ status: 'success', message: 'Configuración de reescritura guardada' });
    } catch (error) {
        console.error('Error al guardar configuración:', error);
        res.status(500).json({ status: 'error', message: 'Error al guardar configuración' });
    }
});

// Ruta para actualizar la configuración de redes sociales
app.post('/api/config/social', async (req, res) => {
    try {
        await database.saveConfig({
            twitter_title_prompt: req.body.twitter_title_prompt,
            twitter_content_prompt: req.body.twitter_content_prompt,
            facebook_title_prompt: req.body.facebook_title_prompt,
            facebook_content_prompt: req.body.facebook_content_prompt,
            instagram_title_prompt: req.body.instagram_title_prompt,
            instagram_content_prompt: req.body.instagram_content_prompt,
            linkedin_title_prompt: req.body.linkedin_title_prompt,
            linkedin_content_prompt: req.body.linkedin_content_prompt
        });
        res.json({ status: 'success', message: 'Configuración de redes sociales guardada' });
    } catch (error) {
        console.error('Error al guardar configuración:', error);
        res.status(500).json({ status: 'error', message: 'Error al guardar configuración' });
    }
});

// Ruta para trigger reescritura
app.post('/api/rewrite', async (req, res) => {
    try {
        const news = await database.getLastFiveNews();
        for (const article of news) {
            await rewriteService.rewriteArticle(article);
        }
        res.json({ status: 'success', message: 'Reescritura iniciada' });
    } catch (error) {
        console.error('Error al iniciar reescritura:', error);
        res.status(500).json({ status: 'error', message: 'Error al iniciar reescritura' });
    }
});

// Ruta para trigger actualización social
app.post('/api/social/update', async (req, res) => {
    try {
        const news = await database.getLastFiveNews();
        for (const article of news) {
            await socialRewriteService.rewriteForSocial(article);
        }
        res.json({ status: 'success', message: 'Actualización social iniciada' });
    } catch (error) {
        console.error('Error al iniciar actualización social:', error);
        res.status(500).json({ status: 'error', message: 'Error al iniciar actualización social' });
    }
});

// Ruta para el panel de administración
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Endpoint para agregar una nueva noticia
app.post('/api/news', async (req, res) => {
    const { title, description, content, url, imageUrl } = req.body;
  
    if (!title || !description || !content || !url) {
        return res.status(400).json({ success: false, error: 'Faltan campos requeridos' });
    }
  
    try {
        const newId = await database.saveArticle({ title, description, content, url, imageUrl });
        res.status(201).json({ success: true, id: newId });
    } catch (error) {
        console.error('Error al agregar noticia:', error);
        res.status(500).json({ success: false, error: 'Error al agregar noticia' });
    }
  });
  
// Función principal
async function main() {
    try {
        // Inicializar la base de datos
        await database.initDatabase();
        console.log('Base de datos inicializada');

        // Iniciar el servidor
        const PORT = process.env.PORT || 3030;
        app.listen(PORT, () => {
            console.log(`Servidor iniciado en puerto ${PORT}`);
        });

        // Iniciar servicios
        console.log('Iniciando servicios...');
        await scraperService.startMonitoring();
        await rewriteService.startRewriting();
        await socialRewriteService.startRewriting();
        console.log('Servicios iniciados correctamente');

    } catch (error) {
        console.error('Error al iniciar la aplicación:', error);
        process.exit(1);
    }
}

// Iniciar la aplicación
main();
