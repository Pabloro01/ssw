const EventEmitter = require('events');
const puppeteer = require('puppeteer');

class ScraperService extends EventEmitter {
  constructor(database) {
      super();
      this.database = database;
      this.isMonitoring = false;
      this.baseUrl = 'https://www.telesoldiario.com';
      this.browser = null;
      this.page = null;
  }

  async initializeBrowser() {
      if (!this.browser) {
          this.browser = await puppeteer.launch({
              headless: 'new',
              args: ['--no-sandbox', '--disable-setuid-sandbox']
          });
      }
      if (!this.page) {
          this.page = await this.browser.newPage();
          await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      }
  }

  async getLastFiveArticles() {
    try {
        await this.initializeBrowser();
        console.log('Obteniendo las últimas 5 noticias...');
  
        await this.page.goto(this.baseUrl, { waitUntil: 'networkidle0' });
        const links = await this.page.evaluate(() => {
            const anchors = document.querySelectorAll('a[href*="/"]');
            return Array.from(anchors)
                .map(a => a.href)
                .filter(href => /\/\d+-.+/.test(href))
                .slice(0, 5);
        });
  
        console.log(`Encontrados ${links.length} enlaces de noticias`);
  
        for (const url of links) {
            try {
                // Extraer el ID numérico de la URL
                const urlMatch = url.match(/\/(\d+)-/);
                const id = urlMatch ? parseInt(urlMatch[1]) : null;
  
                if (!id) {
                    console.log(`No se pudo extraer el ID de la URL: ${url}`);
                    continue;
                }
  
                // Verificar si el artículo ya existe usando el ID
                const exists = await this.database.checkArticleExists(id);
                if (exists) {
                    console.log(`La noticia con ID ${id} ya existe en la base de datos`);
                    continue;
                }
  
                await this.page.goto(url, { waitUntil: 'networkidle0' });
                const article = await this.page.evaluate(() => {
                    const title = document.querySelector('h1')?.textContent?.trim() || '';
                    const description = (
                        document.querySelector('meta[name="description"]')?.content ||
                        document.querySelector('.article-description')?.textContent ||
                        document.querySelector('.description')?.textContent ||
                        document.querySelector('p.lead')?.textContent ||
                        ''
                    ).trim();
  
                    const content = (
                        document.querySelector('.article-content')?.textContent ||
                        document.querySelector('.content')?.textContent ||
                        document.querySelector('article .body')?.textContent ||
                        document.querySelector('.news-content')?.textContent ||
                        Array.from(document.querySelectorAll('.article p'))
                            .map(p => p.textContent.trim())
                            .filter(text => text.length > 0)
                            .join('\n') ||
                        ''
                    ).trim();
  
                    const category = document.querySelector('.category')?.textContent?.trim() || '';
  
                    const imageUrl = (
                        document.querySelector('meta[property="og:image"]')?.content ||
                        document.querySelector('.article-image img')?.src ||
                        document.querySelector('.main-image img')?.src ||
                        document.querySelector('article img')?.src ||
                        ''
                    ).trim();

                    const publishDate = (
                        document.querySelector('meta[property="article:published_time"]')?.content ||
                        document.querySelector('.article-date')?.getAttribute('datetime') ||
                        document.querySelector('.publish-date')?.getAttribute('datetime') ||
                        new Date().toISOString()
                    );
  
                    return {
                        title,
                        description,
                        category,
                        content,
                        imageUrl,
                        publishDate
                    };
                });
  
                if (article.title) {
                    article.url = url;
                    article.id = id; // Añadir el ID extraído al artículo
                    console.log('Noticia encontrada:');
                    console.log(`📰 Título: ${article.title}`);
                    console.log(`📝 Descripción: ${article.description}`);
                    console.log(`📄 Contenido: ${article.content}`);
                    console.log(`🖼️ Imagen: ${article.imageUrl}`);
                    console.log(`🔗 URL: ${article.url}`);
                    console.log(`🆔 ID: ${article.id}`);
                    console.log(`📅 Fecha: ${article.publishDate}`);
  
                    await this.database.saveArticle(article);
                    this.emit('newArticle', article);
                }
            } catch (error) {
                console.error(`Error al procesar la noticia ${url}:`, error);
            }
        }
    } catch (error) {
        console.error('Error al obtener las últimas noticias:', error);
    }
  }

  async startMonitoring() {
      if (this.isMonitoring) {
          console.log('El monitoreo ya está en curso');
          return;
      }

      this.isMonitoring = true;
      console.log('Iniciando monitoreo de noticias...');

      try {
          await this.getLastFiveArticles();

          const checkInterval = setInterval(async () => {
              if (!this.isMonitoring) {
                  clearInterval(checkInterval);
                  return;
              }

              try {
                  await this.getLastFiveArticles();
              } catch (error) {
                  console.error('Error durante el monitoreo:', error);
              }
          }, 5 * 60 * 1000); // Verificar cada 5 minutos
      } catch (error) {
          console.error('Error al iniciar el monitoreo:', error);
          this.isMonitoring = false;
      }
  }

  async stopMonitoring() {
      console.log('Deteniendo el monitoreo...');
      this.isMonitoring = false;
      if (this.browser) {
          await this.browser.close();
          this.browser = null;
          this.page = null;
      }
  }

  async processArticle(article) {
    try {
        // Verifica si el artículo ya existe
        const exists = await this.database.checkArticleExists(article.id);
  
        if (!exists) {
            // Si es nuevo, guarda el artículo original
            await this.database.saveArticle(article);
            console.log(`Artículo ${article.id} guardado en la base de datos`);
        }
  
        // Verifica y procesa la reescritura incluso si el artículo ya existía
        const hasRewritten = await this.database.checkRewrittenExists(article.id);
        if (!hasRewritten) {
            console.log(`Reescribiendo artículo ${article.id}...`);
            try {
                const rewrittenArticle = await this.rewriteService.rewriteArticle(article);
                if (rewrittenArticle) {
                    await this.database.saveRewrittenArticle(rewrittenArticle);
                    console.log(`Artículo ${article.id} reescrito guardado exitosamente`);
                }
            } catch (error) {
                console.error(`Error al reescribir artículo ${article.id}:`, error);
            }
        } else {
            console.log(`Artículo ${article.id} ya tiene versión reescrita`);
        }
  
        // Solo procede con las versiones sociales si ya existe una versión reescrita
        const hasSocial = await this.database.checkSocialExists(article.id);
        if (!hasSocial) {
            const hasRewrittenNow = await this.database.checkRewrittenExists(article.id);
            if (hasRewrittenNow) {
                console.log(`Reescribiendo artículo ${article.id} para redes sociales...`);
                try {
                    const socialVersions = await this.socialRewriteService.rewriteArticle(article);
                    if (socialVersions) {
                        await this.database.saveSocialNews(socialVersions);
                        console.log(`Versiones sociales guardadas para artículo ${article.id}`);
                    }
                } catch (error) {
                    console.error(`Error al crear versiones sociales para artículo ${article.id}:`, error);
                }
            } else {
                console.log(`Artículo ${article.id} necesita ser reescrito antes de crear versiones sociales`);
            }
        } else {
            console.log(`Artículo ${article.id} ya tiene versiones sociales`);
        }
    } catch (error) {
        console.error(`Error procesando artículo ${article.id}:`, error);
    }
  }
}

module.exports = ScraperService;
