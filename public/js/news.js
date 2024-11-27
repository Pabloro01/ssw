// Cargar noticias originales
async function loadNews() {
    try {
        const response = await fetch(`${API_BASE_URL}/news`);
        const data = await response.json();
        const container = document.getElementById('news-container');
        container.innerHTML = '';

        if (!data.data || data.data.length === 0) {
            container.innerHTML = '<div class="alert alert-info">No hay noticias disponibles</div>';
            return;
        }

        data.data.forEach(news => {
            container.innerHTML += `
                <div class="news-card">
                    <div class="news-info">
                        <h4>${news.title}</h4>
                        <p class="text-muted">${new Date(news.created_at).toLocaleString()}</p>
                        <p>${news.description}</p>
                        <div>${news.content}</div>
                    </div>
                    <img src="${news.imageUrl}" alt="${news.title}">
                    <div class="news-actions">
                        <button class="btn btn-sm btn-primary" onclick="editNews(${news.id})"><i class="fas fa-edit"></i> Editar</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteNews(${news.id})"><i class="fas fa-trash"></i> Eliminar</button>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error al cargar noticias:', error);
        document.getElementById('news-container').innerHTML = 
            '<div class="alert alert-danger">Error al cargar las noticias</div>';
    }
}

async function addNews(event) {
    event.preventDefault(); // Evita que el formulario se envíe de manera tradicional

    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const imageUrl = document.getElementById('imageUrl').value;
    const content = document.getElementById('content').value;

    if (!title || !description || !imageUrl || !content) {
        alert('Por favor, complete todos los campos.');
        return;
    }

    const newsData = {
        title,
        description,
        content,
        imageUrl // Asegúrate de que este campo esté presente
    };

    try {
        const response = await fetch(`${API_BASE_URL}/news`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newsData)
        });

        if (response.ok) {
            alert('Noticia agregada con éxito');
            document.getElementById('addNewsForm').reset(); // Reinicia el formulario
            loadNews(); // Recarga las noticias
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al agregar la noticia');
        }
    } catch (error) {
        console.error('Error al agregar noticia:', error);
        alert('Error al agregar la noticia: ' + error.message);
    }
}

// Agregar al final del archivo news.js
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
