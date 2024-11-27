// Cargar noticias sociales
async function loadSocialNews() {
    try {
        const response = await fetch(`${API_BASE_URL}/social-news/latest`);
        const data = await response.json();
        const container = document.getElementById('social-container');
        container.innerHTML = '';

        if (!data.data || data.data.length === 0) {
            container.innerHTML = '<div class="alert alert-info">No hay versiones sociales disponibles</div>';
            return;
        }

        data.data.forEach(news => {
            container.innerHTML += `
                <div class="news-card">
                    <div class="row mt-4">
                        <div class="col-md-6 mb-3">
                            <div class="card">
                                <div class="card-header bg-primary text-white">
                                    <i class="fab fa-twitter me-2"></i>Twitter
                                </div>
                                <div class="card-body">
                                    <h5>${news.twitter_title}</h5>
                                    <p>${news.twitter_text}</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6 mb-3">
                            <div class="card">
                                <div class="card-header bg-primary text-white">
                                    <i class="fab fa-facebook me-2"></i>Facebook
                                </div>
                                <div class="card-body">
                                    <h5>${news.facebook_title}</h5>
                                    <p>${news.facebook_text}</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6 mb-3">
                            <div class="card">
                                <div class="card-header bg-danger text-white">
                                    <i class="fab fa-instagram me-2"></i>Instagram
                                </div>
                                <div class="card-body">
                                    <h5>${news.instagram_title}</h5>
                                    <p>${news.instagram_text}</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6 mb-3">
                            <div class="card">
                                <div class="card-header bg-info text-white">
                                    <i class="fab fa-linkedin me-2"></i>LinkedIn
                                </div>
                                <div class="card-body">
                                    <h5>${news.linkedin_title}</h5>
                                    <p>${news.linkedin_text}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error al cargar versiones sociales:', error);
        document.getElementById('social-container').innerHTML = 
            '<div class="alert alert-danger">Error al cargar las versiones sociales</div>';
    }
}

// Actualizar historial de redes sociales
const socialHistory = document.getElementById('social-history');
socialHistory.innerHTML = data.data.map(config => `
    <div class="history-item">
        <div class="d-flex justify-content-between align-items-center">
            <span class="timestamp">${config.created_at}</span>
            <button class="btn btn-sm btn-outline-primary" onclick='useSocialConfig(${JSON.stringify(config).replace(/'/g, "&#39;")})'>
                Usar estos prompts
            </button>
        </div>
        <div class="mt-3">
            <h6><i class="fab fa-twitter text-primary me-2"></i>Twitter</h6>
            <pre>${config.twitter_title_prompt || 'No disponible'}</pre>
            <pre>${config.twitter_content_prompt || 'No disponible'}</pre>
        </div>
        <div class="mt-3">
            <h6><i class="fab fa-facebook text-primary me-2"></i>Facebook</h6>
            <pre>${config.facebook_title_prompt || 'No disponible'}</pre>
            <pre>${config.facebook_content_prompt || 'No disponible'}</pre>
        </div>
        <div class="mt-3">
            <h6><i class="fab fa-instagram text-danger me-2"></i>Instagram</h6>
            <pre>${config.instagram_title_prompt || 'No disponible'}</pre>
            <pre>${config.instagram_content_prompt || 'No disponible'}</pre>
        </div>
        <div class="mt-3">
            <h6><i class="fab fa-linkedin text-info me-2"></i>LinkedIn</h6>
            <pre>${config.linkedin_title_prompt || 'No disponible'}</pre>
            <pre>${config.linkedin_content_prompt || 'No disponible'}</pre>
        </div>
    </div>
`).join('');


// Usar configuración de reescritura del historial
function useRewriteConfig(config) {
    document.getElementById('rewrite-prompt').value = config.rewrite_prompt || '';
    document.getElementById('rewrite-model').value = config.rewrite_model || 'gpt-3.5-turbo';
    document.getElementById('rewrite-temperature').value = config.rewrite_temperature || 0.7;
}

// Usar configuración de redes sociales del historial
function useSocialConfig(config) {
    document.getElementById('twitter-title-prompt').value = config.twitter_title_prompt || '';
    document.getElementById('twitter-content-prompt').value = config.twitter_content_prompt || '';
    document.getElementById('facebook-title-prompt').value = config.facebook_title_prompt || '';
    document.getElementById('facebook-content-prompt').value = config.facebook_content_prompt || '';
    document.getElementById('instagram-title-prompt').value = config.instagram_title_prompt || '';
    document.getElementById('instagram-content-prompt').value = config.instagram_content_prompt || '';
    document.getElementById('linkedin-title-prompt').value = config.linkedin_title_prompt || '';
    document.getElementById('linkedin-content-prompt').value = config.linkedin_content_prompt || '';
}

