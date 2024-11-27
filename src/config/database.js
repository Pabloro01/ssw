const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, '../../news.db'));
    }

    // Helper methods
    runAsync(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    }

    allAsync(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getAsync(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async initDatabase() {
        return new Promise((resolve, reject) => {
            this.db.serialize(async () => {
                try {
                    // Tabla de noticias originales
                    await this.runAsync(`
                        CREATE TABLE IF NOT EXISTS news (
                            id INTEGER PRIMARY KEY,
                            title TEXT,
                            description TEXT,
                            content TEXT,
                            url TEXT UNIQUE,
                            imageUrl TEXT,
                            publishDate DATETIME,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        )
                    `);

                    // Tabla de noticias reescritas
                    await this.runAsync(`
                        CREATE TABLE IF NOT EXISTS rewritten_news (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            original_id INTEGER,
                            title TEXT,
                            description TEXT,
                            content TEXT,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (original_id) REFERENCES news (id)
                        )
                    `);

                    // Tabla de noticias sociales
                    await this.runAsync(`
                        CREATE TABLE IF NOT EXISTS social_news (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            original_id INTEGER,
                            twitter_title TEXT,
                            twitter_text TEXT,
                            facebook_title TEXT,
                            facebook_text TEXT,
                            instagram_title TEXT,
                            instagram_text TEXT,
                            linkedin_title TEXT,
                            linkedin_text TEXT,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (original_id) REFERENCES news(id)
                        )
                    `);

                    // Tabla de configuración
                    await this.runAsync(`
                        CREATE TABLE IF NOT EXISTS config (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            rewrite_model TEXT DEFAULT 'gpt-3.5-turbo',
                            rewrite_temperature REAL DEFAULT 0.7,
                            rewrite_prompt TEXT,
                            rewrite_max_tokens INTEGER DEFAULT 2000,
                            twitter_title_prompt TEXT,
                            twitter_content_prompt TEXT,
                            facebook_title_prompt TEXT,
                            facebook_content_prompt TEXT,
                            instagram_title_prompt TEXT,
                            instagram_content_prompt TEXT,
                            linkedin_title_prompt TEXT,
                            linkedin_content_prompt TEXT,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        )
                    `);

                    // Vista para historial de configuraciones
                    await this.runAsync(`
                        CREATE VIEW IF NOT EXISTS config_history AS
                        SELECT 
                            id,
                            rewrite_prompt,
                            rewrite_model,
                            rewrite_temperature,
                            twitter_title_prompt,
                            twitter_content_prompt,
                            facebook_title_prompt,
                            facebook_content_prompt,
                            instagram_title_prompt,
                            instagram_content_prompt,
                            linkedin_title_prompt,
                            linkedin_content_prompt,
                            created_at
                        FROM config
                        ORDER BY created_at DESC
                    `);

                    // Check if config exists and insert default if not
                    const config = await this.getConfig();
                    if (!config) {
                        await this.runAsync(`
                            INSERT INTO config (
                                rewrite_prompt,
                                twitter_title_prompt,
                                twitter_content_prompt,
                                facebook_title_prompt,
                                facebook_content_prompt,
                                instagram_title_prompt,
                                instagram_content_prompt,
                                linkedin_title_prompt,
                                linkedin_content_prompt
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            "Eres un editor experto. Reescribe el siguiente artículo manteniendo la información importante pero mejorando su claridad y estilo.",
                            "Crea un título atractivo para Twitter que resuma la noticia en menos de 280 caracteres.",
                            "Adapta esta noticia para Twitter, manteniendo un tono informativo pero casual.",
                            "Crea un título llamativo para Facebook que genere engagement.",
                            "Adapta esta noticia para Facebook, incluyendo detalles relevantes y un tono cercano.",
                            "Crea un título visual y atractivo para Instagram.",
                            "Adapta esta noticia para Instagram, usando un tono más visual y emocional.",
                            "Crea un título profesional para LinkedIn.",
                            "Adapta esta noticia para LinkedIn, manteniendo un tono profesional y analítico."
                        ]);
                    }

                    resolve();
                } catch (error) {
                    console.error('Error en initDatabase:', error);
                    reject(error);
                }
            });
        });
    }

    // Métodos de verificación
    async checkArticleExists(id) {
        const row = await this.getAsync('SELECT id FROM news WHERE id = ?', [id]);
        return !!row;
    }

    async checkArticleExistsByUrl(url) {
        const row = await this.getAsync('SELECT id FROM news WHERE url = ?', [url]);
        return !!row;
    }

    async checkRewrittenExists(originalId) {
        const row = await this.getAsync('SELECT id FROM rewritten_news WHERE original_id = ?', [originalId]);
        return !!row;
    }

    async checkSocialExists(originalId) {
        const row = await this.getAsync('SELECT id FROM social_news WHERE original_id = ?', [originalId]);
        return !!row;
    }

    // Métodos de guardado
    async saveArticle(article) {
        return new Promise((resolve, reject) => {
            const { title, description, content, url, imageUrl } = article;
      
            this.db.run(`
                INSERT INTO news (title, description, content, url, imageUrl)
                VALUES (?, ?, ?, ?, ?)
            `, [title, description, content, url, imageUrl], function(err) {
                if (err) {
                    console.error('Error al guardar la noticia:', err);
                    reject(err);
                } else {
                    resolve(this.lastID); // Devuelve el ID de la nueva noticia
                }
            });
        });
      }

    // Métodos de consulta
    async getLastFiveNews() {
        return this.allAsync(`
            SELECT 
                id,
                title,
                description,
                content,
                url,
                imageUrl,
                publishDate,
                created_at
            FROM news 
            ORDER BY id DESC 
            LIMIT 5
        `);
    }

    async getLastFiveRewrittenNews() {
        return this.allAsync(`
            SELECT 
                r.original_id as id,
                r.title,
                r.description,
                r.content,
                n.imageUrl,
                r.created_at
            FROM rewritten_news r
            JOIN news n ON n.id = r.original_id
            ORDER BY n.id DESC
            LIMIT 5
        `);
    }

    async getLastFiveSocialNews() {
        return this.allAsync(`
            SELECT 
                s.original_id as id,
                s.twitter_title,
                s.twitter_text,
                s.facebook_title,
                s.facebook_text,
                s.instagram_title,
                s.instagram_text,
                s.linkedin_title,
                s.linkedin_text,
                n.imageUrl,
                s.created_at
            FROM social_news s
            JOIN news n ON n.id = s.original_id
            ORDER BY n.id DESC
            LIMIT 5
        `);
    }

    async getConfigHistory() {
        return this.allAsync(`
            SELECT 
                id,
                rewrite_prompt,
                rewrite_model,
                rewrite_temperature,
                twitter_title_prompt,
                twitter_content_prompt,
                facebook_title_prompt,
                facebook_content_prompt,
                instagram_title_prompt,
                instagram_content_prompt,
                linkedin_title_prompt,
                linkedin_content_prompt,
                created_at
            FROM config
            ORDER BY created_at DESC
            LIMIT 10
        `);
    }

    // Métodos de configuración
    async getConfig() {
        return this.getAsync('SELECT * FROM config ORDER BY created_at DESC LIMIT 1');
    }

    async saveConfig(config) {
        return this.runAsync(`
            INSERT INTO config (
                rewrite_model,
                rewrite_temperature,
                rewrite_prompt,
                rewrite_max_tokens,
                twitter_title_prompt,
                twitter_content_prompt,
                facebook_title_prompt,
                facebook_content_prompt,
                instagram_title_prompt,
                instagram_content_prompt,
                linkedin_title_prompt,
                linkedin_content_prompt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            config.rewrite_model || 'gpt-3.5-turbo',
            config.rewrite_temperature || 0.7,
            config.rewrite_prompt,
            config.rewrite_max_tokens || 2000,
            config.twitter_title_prompt,
            config.twitter_content_prompt,
            config.facebook_title_prompt,
            config.facebook_content_prompt,
            config.instagram_title_prompt,
            config.instagram_content_prompt,
            config.linkedin_title_prompt,
            config.linkedin_content_prompt
        ]);
    }

    async saveRewrittenArticle(originalId, rewrittenArticle) {
        return this.runAsync(`
            INSERT INTO rewritten_news (original_id, title, description, content)
            VALUES (?, ?, ?, ?)
        `, [
            originalId,
            rewrittenArticle.title,
            rewrittenArticle.description,
            rewrittenArticle.content
        ]);
    }

    async saveSocialNews(originalId, socialContent) {
        return this.runAsync(`
            INSERT INTO social_news (
                original_id,
                twitter_title,
                twitter_text,
                facebook_title,
                facebook_text,
                instagram_title,
                instagram_text,
                linkedin_title,
                linkedin_text
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            originalId,
            socialContent.twitter_title,
            socialContent.twitter_text,
            socialContent.facebook_title,
            socialContent.facebook_text,
            socialContent.instagram_title,
            socialContent.instagram_text,
            socialContent.linkedin_title,
            socialContent.linkedin_text
        ]);
    }
}

module.exports = Database;
