const express = require('express');
const router = express.Router();
const Database = require('../../config/database');
const News = require('./News'); // Asegúrate de que la ruta sea correcta
const db = new Database();

// Obtener todas las noticias
router.get('/news', async (req, res) => {
    try {
        const news = await db.getLastFiveNews();
        res.json({
            status: 'success',
            data: news
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Obtener noticias reescritas
router.get('/rewritten-news', async (req, res) => {
    try {
        const news = await db.getLastFiveRewrittenNews();
        res.json({
            status: 'success',
            data: news
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Obtener noticias para redes sociales
router.get('/social-news', async (req, res) => {
    try {
        const news = await db.getLastFiveSocialNews();
        res.json({
            status: 'success',
            data: news
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Obtener una noticia específica por ID
router.get('/news/:id', async (req, res) => {
    try {
        const news = await db.getAsync('SELECT * FROM news WHERE id = ?', [req.params.id]);
        if (!news) {
            return res.status(404).json({
                status: 'error',
                message: 'Noticia no encontrada'
            });
        }
        res.json({
            status: 'success',
            data: news
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});


// Ruta para agregar noticias
// Ruta para agregar una nueva noticia
router.post('/news', async (req, res) => {
    try {
      const { title, description, imageUrl, content } = req.body;
      const addedNews = await newsService.addNews(title, description, imageUrl, content);
      res.json({ success: true, data: addedNews });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

// Editar una noticia existente
router.put('/news/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, content, imageUrl } = req.body;
        const updatedNews = { id, title, description, content, imageUrl };
        await db.updateArticle(updatedNews);
        res.json({ status: 'success', message: 'Noticia actualizada', data: updatedNews });
    } catch (error) {
        console.error('Error al actualizar noticia:', error);
        res.status(500).json({ status: 'error', message: 'Error al actualizar noticia' });
    }
});

// Eliminar una noticia
router.delete('/news/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.deleteArticle(id);
        res.json({ status: 'success', message: 'Noticia eliminada' });
    } catch (error) {
        console.error('Error al eliminar noticia:', error);
        res.status(500).json({ status: 'error', message: 'Error al eliminar noticia' });
    }
});

module.exports = router;
