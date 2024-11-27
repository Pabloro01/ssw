const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
const News = require('./News'); // Asegúrate de que la ruta sea correcta
const newsRoutes = require('./newsRoutes'); // Asegúrate de que la ruta sea correcta

// Middleware
app.use(cors({
  origin: '*'
}));
app.use(express.json());

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../../public')));

// Rutas API
app.use('/api', newsRoutes);

// Ruta para el panel de administración
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/admin.html'));
});

// Ruta para agregar noticias
app.post('/api/news', async (req, res) => {
    try {
      const { title, description, imageUrl, content } = req.body;
      const addedNews = await News.create({
        title,
        description,
        imageUrl,
        content,
        url: '', // Asegúrate de proporcionar un valor adecuado o dejarlo vacío si no es necesario
        publishDate: new Date().toISOString() // O usa el valor que desees
      });
      res.json({ success: true, data: addedNews });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
    });

module.exports = app;