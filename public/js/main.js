
        // Mostrar/ocultar secciones
        function showSection(sectionId) {
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById(`${sectionId}-section`).classList.add('active');

            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            event.target.classList.add('active');

            // Cargar datos según la sección
            if (sectionId === 'news') {
                loadNews();
            } else if (sectionId === 'rewrite') {
                loadRewriteConfig();
                loadRewrittenNews();
                loadConfigHistory();
            } else if (sectionId === 'social') {
                loadSocialConfig();
                loadSocialNews();
                loadConfigHistory();
            }
        }

        async function loadConfigHistory() {
            try {
                const response = await fetch(`${API_BASE_URL}/config/history`);
                const data = await response.json();
                
                if (!data.data || data.data.length === 0) {
                    document.getElementById('rewrite-history').innerHTML = 
                        '<div class="alert alert-info">No hay historial disponible</div>';
                    document.getElementById('social-history').innerHTML = 
                        '<div class="alert alert-info">No hay historial disponible</div>';
                    return;
                }

                // Actualizar historial de reescritura
                const rewriteHistory = document.getElementById('rewrite-history');
                rewriteHistory.innerHTML = data.data.map(config => `
                    <div class="history-item">
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="timestamp">${config.created_at}</span>
                            <button class="btn btn-sm btn-outline-primary" onclick='useRewriteConfig(${JSON.stringify(config).replace(/'/g, "&#39;")})'>
                                Usar este prompt
                            </button>
                        </div>
                        <pre>${config.rewrite_prompt || 'No disponible'}</pre>
                        <small>Modelo: ${config.rewrite_model}, Temperatura: ${config.rewrite_temperature}</small>
                    </div>
                `).join('');

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
            } catch (error) {
                console.error('Error al cargar historial:', error);
                document.getElementById('rewrite-history').innerHTML = 
                    '<div class="alert alert-danger">Error al cargar el historial</div>';
                document.getElementById('social-history').innerHTML = 
                    '<div class="alert alert-danger">Error al cargar el historial</div>';
            }
        }
        
         // Inicialización
         document.addEventListener('DOMContentLoaded', () => {
            loadNews();
            loadConfigHistory();
        });