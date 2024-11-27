const API_BASE_URL = 'http://localhost:3030/api';


// Cargar ambas configuraciones cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    loadRewriteConfig();
    loadSocialConfig();
});

// Funciones de configuración
async function loadRewriteConfig() {
    try {
        const response = await fetch(`${API_BASE_URL}/config`);
        const data = await response.json();
        if (!data.data) return;

        const config = data.data;
        
        // Obtener referencias a los elementos
        const rewritePromptElement = document.getElementById('rewrite-prompt');
        const rewriteModelElement = document.getElementById('rewrite-model');
        const rewriteTempElement = document.getElementById('rewrite-temperature');
        
        // Verificar que los elementos existan antes de asignar valores
        if (rewritePromptElement) rewritePromptElement.value = config.rewrite_prompt || '';
        if (rewriteModelElement) rewriteModelElement.value = config.rewrite_model || 'gpt-3.5-turbo';
        if (rewriteTempElement) rewriteTempElement.value = config.rewrite_temperature || 0.7;
    } catch (error) {
        console.error('Error al cargar configuración de reescritura:', error);
    }
}

// Cargar configuración de redes sociales
async function loadSocialConfig() {
    try {
        const response = await fetch(`${API_BASE_URL}/config`);
        const data = await response.json();
        if (!data.data) return;

        const config = data.data;
        
        // Cargar configuración para cada red social
        const elements = {
            twitter: ['twitter-title-prompt', 'twitter-content-prompt'],
            facebook: ['facebook-title-prompt', 'facebook-content-prompt'],
            instagram: ['instagram-title-prompt', 'instagram-content-prompt'],
            linkedin: ['linkedin-title-prompt', 'linkedin-content-prompt']
        };

        // Asignar valores a cada elemento si existe
        Object.entries(elements).forEach(([network, ids]) => {
            ids.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    const configKey = id.replace('-', '_');
                    element.value = config[configKey] || '';
                }
            });
        });
    } catch (error) {
        console.error('Error al cargar configuración social:', error);
    }
}

// Guardar configuración de reescritura
async function saveRewriteConfig() {
    const rewritePromptElement = document.getElementById('rewrite-prompt');
    const rewriteModelElement = document.getElementById('rewrite-model');
    const rewriteTempElement = document.getElementById('rewrite-temperature');

    if (!rewritePromptElement || !rewriteModelElement || !rewriteTempElement) {
        console.error('No se encontraron todos los elementos necesarios');
        return;
    }

    const config = {
        rewrite_prompt: rewritePromptElement.value,
        rewrite_model: rewriteModelElement.value,
        rewrite_temperature: parseFloat(rewriteTempElement.value)
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

// Guardar configuración de redes sociales
async function saveSocialConfig() {
    const config = {};
    const socialElements = [
        'twitter-title-prompt', 'twitter-content-prompt',
        'facebook-title-prompt', 'facebook-content-prompt',
        'instagram-title-prompt', 'instagram-content-prompt',
        'linkedin-title-prompt', 'linkedin-content-prompt'
    ];

    // Recopilar valores de todos los elementos
    for (const elementId of socialElements) {
        const element = document.getElementById(elementId);
        if (element) {
            const configKey = elementId.replace('-', '_');
            config[configKey] = element.value;
        }
    }

    try {
        const response = await fetch(`${API_BASE_URL}/config/social`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        if (response.ok) {
            alert('Configuración guardada. Actualizando versiones sociales...');
            await fetch(`${API_BASE_URL}/social/update`, { method: 'POST' });
            loadSocialNews();
        } else {
            throw new Error('Error al guardar la configuración');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar la configuración');
    }
}
