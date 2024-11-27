const OpenAI = require('openai');

class RewriteService {
    constructor(database, openaiApiKey) {
        this.database = database;
        this.openai = new OpenAI({
            apiKey: openaiApiKey
        });
        this.isRewriting = false;
    }

    async rewriteArticle(article) {
        try {
            // Primero verificar si ya existe una versión reescrita
            const existingRewrite = await this.database.checkRewrittenExists(article.id);
            if (existingRewrite) {
                console.log(`ℹ️ Artículo ${article.id} ya está reescrito, omitiendo...`);
                return null;
            }
            console.log(`Reescribiendo artículo ID ${article.id}...`);
            const config = await this.database.getConfig();

            const prompt = `
            Reescribe esta noticia de manera única y original, manteniendo la información esencial pero con un estilo diferente.

            Noticia original:
            ${article.title}
            ${article.description}
            ${article.content}

            Por favor, proporciona:
            1. Un nuevo título
            2. Una nueva descripción
            3. El contenido reescrito

            Formato de respuesta requerido:
            ---TÍTULO---
            [Escribe aquí el nuevo título sin asteriscos ni la palabra "Título:"]
            ---DESCRIPCIÓN---
            [Escribe aquí la nueva descripción]
            ---CONTENIDO---
            [Escribe aquí el contenido reescrito]
            ---FIN---`;

            const completion = await this.openai.chat.completions.create({
                model: config.model || 'gpt-3.5-turbo',
                messages: [
                    { 
                        role: "system", 
                        content: "Eres un periodista experto. Reescribe el contenido de forma natural, sin usar marcadores como asteriscos o palabras como 'Título:'. Proporciona el contenido directamente." 
                    },
                    { role: "user", content: prompt }
                ],
                max_tokens: config.max_tokens || 2000,
                temperature: config.temperature || 0.7,
            });

            const response = completion.choices[0].message.content;

            // Función auxiliar para extraer contenido entre marcadores
            const extractContent = (text, startMarker, endMarker) => {
                const start = text.indexOf(startMarker);
                if (start === -1) return '';

                const contentStart = start + startMarker.length;
                const end = endMarker === '---FIN---' 
                    ? text.indexOf(endMarker, contentStart)
                    : text.indexOf('---', contentStart);

                if (end === -1) return '';

                return text.substring(contentStart, end)
                    .trim()
                    .replace(/\*\*/g, '') // Eliminar asteriscos
                    .replace(/^Título:\s*/i, '') // Eliminar "Título:" al inicio
                    .replace(/^Descripción:\s*/i, '') // Eliminar "Descripción:" al inicio
                    .replace(/^Contenido:\s*/i, ''); // Eliminar "Contenido:" al inicio
            };

            const rewrittenArticle = {
                title: extractContent(response, '---TÍTULO---', '---DESCRIPCIÓN---'),
                description: extractContent(response, '---DESCRIPCIÓN---', '---CONTENIDO---'),
                content: extractContent(response, '---CONTENIDO---', '---FIN---')
            };

            // Verificar que todos los campos tengan contenido
            if (!rewrittenArticle.title || !rewrittenArticle.description || !rewrittenArticle.content) {
                console.log('⚠️ Contenido faltante, intentando segundo intento...');

                // Segundo intento con prompt más estricto
                const secondAttempt = await this.openai.chat.completions.create({
                    model: config.model || 'gpt-3.5-turbo',
                    messages: [
                        { 
                            role: "system", 
                            content: "Eres un periodista experto. IMPORTANTE: Proporciona el contenido directamente, sin usar asteriscos ni palabras como 'Título:'. Solo el texto reescrito." 
                        },
                        { role: "user", content: prompt }
                    ],
                    max_tokens: config.max_tokens || 2000,
                    temperature: 0.5,
                });

                const secondResponse = secondAttempt.choices[0].message.content;

                rewrittenArticle.title = extractContent(secondResponse, '---TÍTULO---', '---DESCRIPCIÓN---');
                rewrittenArticle.description = extractContent(secondResponse, '---DESCRIPCIÓN---', '---CONTENIDO---');
                rewrittenArticle.content = extractContent(secondResponse, '---CONTENIDO---', '---FIN---');
            }

            // Verificación final del contenido
            if (!rewrittenArticle.title || !rewrittenArticle.description || !rewrittenArticle.content) {
                throw new Error('No se pudo generar contenido válido después de dos intentos');
            }

            await this.database.saveRewrittenArticle(article.id, rewrittenArticle);
            console.log(`✅ Artículo ${article.id} reescrito y guardado correctamente`);
            return rewrittenArticle;
        } catch (error) {
            console.error(`Error al reescribir artículo ${article.id}:`, error);
            throw error;
        }
    }

    async rewriteLastFiveArticles() {
        try {
            const articles = await this.database.getLastFiveNews();
            console.log(`Encontradas ${articles.length} noticias para reescribir`);

            for (const article of articles) {
                try {
                    await this.rewriteArticle(article);
                } catch (error) {
                    console.error(`Error al reescribir artículo ${article.id}:`, error);
                    continue;
                }
            }
        } catch (error) {
            console.error('Error al obtener las últimas noticias:', error);
        }
    }

    async startRewriting() {
        if (this.isRewriting) {
            console.log('El proceso de reescritura ya está en curso');
            return;
        }

        this.isRewriting = true;
        console.log('Iniciando servicio de reescritura...');

        try {
            await this.rewriteLastFiveArticles();

            const rewriteInterval = setInterval(async () => {
                if (!this.isRewriting) {
                    clearInterval(rewriteInterval);
                    return;
                }

                try {
                    await this.rewriteLastFiveArticles();
                } catch (error) {
                    console.error('Error durante la reescritura:', error);
                }
            }, 10 * 60 * 1000); // Cada 10 minutos
        } catch (error) {
            console.error('Error al iniciar el servicio de reescritura:', error);
            this.isRewriting = false;
        }
    }

    async stopRewriting() {
        console.log('Deteniendo el servicio de reescritura...');
        this.isRewriting = false;
    }
}

module.exports = RewriteService;
