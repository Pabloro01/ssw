const OpenAI = require('openai');

class SocialRewriteService {
    constructor(database, openaiApiKey) {
        this.database = database;
        this.openai = new OpenAI({
            apiKey: openaiApiKey
        });
        this.isRewriting = false;
    }

    async rewriteForSocial(article) {
        try {
            // Primero verificar si ya existe una versión social
            const existingSocial = await this.database.checkSocialExists(article.id);
            if (existingSocial) {
                console.log(`ℹ️ Artículo ${article.id} ya tiene versiones sociales, omitiendo...`);
                return null;
            }
            console.log(`\nProcesando artículo ${article.id} para redes sociales...`);

            console.log(`🔄 Reescribiendo noticia ID ${article.id} para redes sociales...`);
            const config = await this.database.getConfig();

            const prompt = `
            Reescribe esta noticia para redes sociales. Para cada red social, genera un título atractivo y el contenido adaptado.
            Genera 4 versiones, cada una con título y contenido:

            1. Twitter (título máximo 50 caracteres, contenido máximo 280 caracteres)
            2. Facebook (título informativo y contenido detallado)
            3. Instagram (título llamativo y contenido casual)
            4. LinkedIn (título profesional y contenido formal)

            Noticia original:
            Título: ${article.title}
            Descripción: ${article.description}
            Contenido: ${article.content}

            Formato de respuesta requerido (mantén exactamente estos marcadores):
            ---TWITTER TÍTULO---
            [título para Twitter]
            ---TWITTER CONTENIDO---
            [contenido para Twitter]
            ---FACEBOOK TÍTULO---
            [título para Facebook]
            ---FACEBOOK CONTENIDO---
            [contenido para Facebook]
            ---INSTAGRAM TÍTULO---
            [título para Instagram]
            ---INSTAGRAM CONTENIDO---
            [contenido para Instagram]
            ---LINKEDIN TÍTULO---
            [título para LinkedIn]
            ---LINKEDIN CONTENIDO---
            [contenido para LinkedIn]
            ---FIN---`;

            const completion = await this.openai.chat.completions.create({
                model: config.social_model || 'gpt-3.5-turbo',
                messages: [
                    { 
                        role: "system", 
                        content: config.social_prompt || "Eres un experto en marketing digital y redes sociales. Asegúrate de seguir exactamente el formato solicitado con los marcadores específicos." 
                    },
                    { role: "user", content: prompt }
                ],
                max_tokens: config.social_max_tokens || 2000,
                temperature: config.social_temperature || 0.7,
            });

            const response = completion.choices[0].message.content;
            console.log(`✅ Respuesta de OpenAI recibida para artículo ${article.id}`);

            // Función auxiliar para extraer contenido entre marcadores
            const extractContent = (text, startMarker, endMarker) => {
                const start = text.indexOf(startMarker);
                if (start === -1) return '';

                const contentStart = start + startMarker.length;
                const end = endMarker === '---FIN---' 
                    ? text.indexOf(endMarker, contentStart)
                    : text.indexOf('---', contentStart);

                if (end === -1) return '';

                return text.substring(contentStart, end).trim();
            };

            const socialVersions = {
                twitter_title: extractContent(response, '---TWITTER TÍTULO---', '---TWITTER CONTENIDO---'),
                twitter_text: extractContent(response, '---TWITTER CONTENIDO---', '---FACEBOOK TÍTULO---'),
                facebook_title: extractContent(response, '---FACEBOOK TÍTULO---', '---FACEBOOK CONTENIDO---'),
                facebook_text: extractContent(response, '---FACEBOOK CONTENIDO---', '---INSTAGRAM TÍTULO---'),
                instagram_title: extractContent(response, '---INSTAGRAM TÍTULO---', '---INSTAGRAM CONTENIDO---'),
                instagram_text: extractContent(response, '---INSTAGRAM CONTENIDO---', '---LINKEDIN TÍTULO---'),
                linkedin_title: extractContent(response, '---LINKEDIN TÍTULO---', '---LINKEDIN CONTENIDO---'),
                linkedin_text: extractContent(response, '---LINKEDIN CONTENIDO---', '---FIN---')
            };

            // Verificar que todos los campos tengan contenido
            const networks = ['twitter', 'facebook', 'instagram', 'linkedin'];
            let allFieldsHaveContent = true;

            for (const network of networks) {
                if (!socialVersions[`${network}_title`] || !socialVersions[`${network}_text`]) {
                    console.error(`❌ Falta contenido para ${network}`);
                    allFieldsHaveContent = false;
                    break;
                }
            }

            if (!allFieldsHaveContent) {
                console.log('⚠️ Intentando reescribir con un segundo intento...');
                // Hacer un segundo intento con un prompt más estricto
                const secondAttempt = await this.openai.chat.completions.create({
                    model: config.social_model || 'gpt-3.5-turbo',
                    messages: [
                        { 
                            role: "system", 
                            content: "Eres un experto en marketing digital. DEBES seguir EXACTAMENTE el formato solicitado." 
                        },
                        { role: "user", content: prompt }
                    ],
                    max_tokens: config.social_max_tokens || 2000,
                    temperature: 0.5, // Temperatura más baja para respuestas más consistentes
                });

                const secondResponse = secondAttempt.choices[0].message.content;

                // Actualizar las versiones sociales con el segundo intento
                socialVersions.twitter_title = extractContent(secondResponse, '---TWITTER TÍTULO---', '---TWITTER CONTENIDO---') || 'Error en extracción';
                socialVersions.twitter_text = extractContent(secondResponse, '---TWITTER CONTENIDO---', '---FACEBOOK TÍTULO---') || 'Error en extracción';
                socialVersions.facebook_title = extractContent(secondResponse, '---FACEBOOK TÍTULO---', '---FACEBOOK CONTENIDO---') || 'Error en extracción';
                socialVersions.facebook_text = extractContent(secondResponse, '---FACEBOOK CONTENIDO---', '---INSTAGRAM TÍTULO---') || 'Error en extracción';
                socialVersions.instagram_title = extractContent(secondResponse, '---INSTAGRAM TÍTULO---', '---INSTAGRAM CONTENIDO---') || 'Error en extracción';
                socialVersions.instagram_text = extractContent(secondResponse, '---INSTAGRAM CONTENIDO---', '---LINKEDIN TÍTULO---') || 'Error en extracción';
                socialVersions.linkedin_title = extractContent(secondResponse, '---LINKEDIN TÍTULO---', '---LINKEDIN CONTENIDO---') || 'Error en extracción';
                socialVersions.linkedin_text = extractContent(secondResponse, '---LINKEDIN CONTENIDO---', '---FIN---') || 'Error en extracción';
            }

            // Añadir un pequeño delay antes de guardar
            await new Promise(resolve => setTimeout(resolve, 1000));

            await this.database.saveSocialNews(article.id, socialVersions);
            console.log(`✅ Versiones sociales guardadas para noticia ID ${article.id}`);
            return socialVersions;
        } catch (error) {
            console.error(`❌ Error al reescribir noticia ID ${article.id} para redes sociales:`, error);
            throw error;
        }
    }

    async rewriteLastFiveForSocial() {
        try {
            const articles = await this.database.getLastFiveNews();
            console.log(`\n📋 Encontradas ${articles.length} noticias para reescribir para redes sociales`);

            for (const article of articles) {
                try {
                    await this.rewriteForSocial(article);
                    // Añadir delay entre cada artículo
                    await new Promise(resolve => setTimeout(resolve, 3000));
                } catch (error) {
                    console.error(`❌ Error al reescribir noticia ID ${article.id} para redes sociales:`, error);
                    continue;
                }
            }
        } catch (error) {
            console.error('❌ Error al obtener las últimas noticias:', error);
        }
    }

    async startRewriting() {
        if (this.isRewriting) {
            console.log('⚠️ El proceso de reescritura social ya está en curso');
            return;
        }

        this.isRewriting = true;
        console.log('🚀 Iniciando servicio de reescritura social...');

        try {
            await this.rewriteLastFiveForSocial();

            const rewriteInterval = setInterval(async () => {
                if (!this.isRewriting) {
                    clearInterval(rewriteInterval);
                    return;
                }

                try {
                    await this.rewriteLastFiveForSocial();
                } catch (error) {
                    console.error('❌ Error durante la reescritura social:', error);
                }
            }, 15 * 60 * 1000); // Cada 15 minutos
        } catch (error) {
            console.error('❌ Error al iniciar el servicio de reescritura social:', error);
            this.isRewriting = false;
        }
    }

    async stopRewriting() {
        console.log('🛑 Deteniendo el servicio de reescritura social...');
        this.isRewriting = false;
    }
}

module.exports = SocialRewriteService;
