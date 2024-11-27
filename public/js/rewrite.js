// rewrite.js

document.addEventListener('DOMContentLoaded', function() {
    loadRewriteConfig();
});

async function loadRewriteConfig() {
    try {
        const response = await fetch(`${API_BASE_URL}/config`);
        const data = await response.json();
        if (!data.data) return;

        const config = data.data;
        
        const promptElement = document.getElementById('rewrite-prompt');
        const modelElement = document.getElementById('rewrite-model');
        const temperatureElement = document.getElementById('rewrite-temperature');

        if (promptElement) promptElement.value = config.rewrite_prompt || '';
        if (modelElement) modelElement.value = config.rewrite_model || 'gpt-3.5-turbo';
        if (temperatureElement) temperatureElement.value = config.rewrite_temperature || 0.7;
    } catch (error) {
        console.error('Error al cargar configuración:', error);
    }
}

async function loadRewrittenNews() {
    try {
        const response = await fetch(`${API_BASE_URL}/rewritten-news/latest`);
        const data = await response.json();
        const container = document.getElementById('rewritten-container');
        container.innerHTML = '';

        if (!data.data || data.data.length === 0) {
            container.innerHTML = '<div class="alert alert-info">No hay noticias reescritas disponibles</div>';
            return;
        }

        data.data.forEach(news => {
            container.innerHTML += `
                <div class="news-card">
                    ${news.imageUrl ? `<img src="${news.imageUrl}" alt="${news.title}">` : ''}
                    <h4>${news.title}</h4>
                    <p>${news.description}</p>
                    <div>${news.content}</div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error al cargar noticias reescritas:', error);
        document.getElementById('rewritten-container').innerHTML = 
            '<div class="alert alert-danger">Error al cargar las noticias reescritas</div>';
    }
}

async function saveRewriteConfig() {
    const config = {
        rewrite_prompt: document.getElementById('rewrite-prompt').value,
        rewrite_model: document.getElementById('rewrite-model').value,
        rewrite_temperature: parseFloat(document.getElementById('rewrite-temperature').value)
    };

    try {
        const response = await fetch(`${API_BASE_URL}/config/rewrite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        if (response.ok) {
            alert('Configuración guardada. Reescribiendo noticias...');
            await fetch(`${API_BASE_URL}/rewrite`, { method: 'POST' });
            loadRewrittenNews();
        } else {
            throw new Error('Error al guardar la configuración');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar la configuración');
    }

   
}


