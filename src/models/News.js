const db = require('../config/database');

class News {
    static async create(news) {
        return new Promise((resolve, reject) => {
            const { title, description, content, url, publishDate, imageUrl } = news;
            const now = new Date().toISOString();
            db.run(
                'INSERT INTO news (title, description, content, url, publishDate, imageUrl, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [title, description, content, url, publishDate || now, imageUrl, now],
                function(err) {
                    if (err) {
                        if (err.code === 'SQLITE_CONSTRAINT') {
                            resolve(null);
                        } else {
                            reject(err);
                        }
                    } else {
                        resolve(this.lastID);
                    }
                }
            );
        });
    }

    static async getAll(page = 1, limit = 10) {
        return new Promise((resolve, reject) => {
            const offset = (page - 1) * limit;
            
            // Primero obtener el total de registros
            db.get('SELECT COUNT(*) as total FROM news', [], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }

                const total = row.total;
                const totalPages = Math.ceil(total / limit);

                // Luego obtener los registros paginados
                db.all(
                    'SELECT id, title, description, content, url, imageUrl, publishDate, created_at FROM news ORDER BY publishDate DESC LIMIT ? OFFSET ?',
                    [limit, offset],
                    (err, rows) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve({
                            items: rows,
                            total,
                            totalPages
                        });
                    }
                );
            });
        });
    }

    static async getById(id) {
        return new Promise((resolve, reject) => {
            db.get('SELECT id, title, description, content, url, imageUrl, publishDate, created_at FROM news WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });
    }

    static async getLatest(count = 5) {
        return new Promise((resolve, reject) => {
            db.all(
                'SELECT id, title, description, content, url, imageUrl, publishDate, created_at FROM news ORDER BY publishDate DESC LIMIT ?',
                [count],
                (err, rows) => {
                    if (err) reject(err);
                    resolve(rows);
                }
            );
        });
    }

    static async search(query) {
        return new Promise((resolve, reject) => {
            const searchQuery = `%${query}%`;
            db.all(
                'SELECT id, title, description, content, url, imageUrl, publishDate, created_at FROM news WHERE title LIKE ? OR content LIKE ? ORDER BY publishDate DESC',
                [searchQuery, searchQuery],
                (err, rows) => {
                    if (err) reject(err);
                    resolve(rows);
                }
            );
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadNews();
});

async function handleResponse(response) {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return await response.json();
    }
    throw new Error('Respuesta no válida del servidor');
}

module.exports = News;