/**
 * DECY Backend Server
 * AI Tool Recommendation API
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const RecommendationEngine = require('./services/recommendation');
const ToolScraper = require('./services/scraper');
const monetization = require('./services/monetization');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize engines
const engine = new RecommendationEngine(process.env.GEMINI_API_KEY);
const scraper = new ToolScraper();
engine.setScraper(scraper);  // Connect scraper for auto-discovery

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'DECY API',
        version: '1.0.0',
        geminiEnabled: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'
    });
});

/**
 * POST /api/chat
 * Conversational endpoint - handles questions and detects intent
 * Body: { message: string, history?: Array<{role: 'user'|'assistant', content: string}> }
 * Returns: { type: 'question' | 'tool_request', response?: string }
 */
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history = [] } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Please enter a message'
            });
        }

        const result = await engine.handleChat(message.trim(), history);
        res.json(monetization.monetizeResponse(result));
    } catch (error) {
        console.error('[DECY] Chat error:', error);
        res.status(500).json({
            success: false,
            type: 'error',
            response: 'Something went wrong. Please try again.'
        });
    }
});


/**
 * POST /api/recommend
 * Get AI tool recommendations
 * Body: { query: string, budget: 'free' | 'premium', category?: string }
 */
app.post('/api/recommend', async (req, res) => {
    try {
        const { query, budget = 'free', category = null } = req.body;

        if (!query || query.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Please tell me what you want to do'
            });
        }

        const recommendations = await engine.getRecommendations(query.trim(), budget, category);

        res.json(monetization.monetizeResponse(recommendations));
    } catch (error) {
        console.error('[DECY] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Something went wrong. Please try again.'
        });
    }
});

/**
 * POST /api/tools-by-ids
 * Get specific tools by their IDs (used when AI recommends specific tools)
 * Body: { toolIds: string[], budget: 'free' | 'premium' }
 */
app.post('/api/tools-by-ids', async (req, res) => {
    try {
        const { toolIds, budget = 'free' } = req.body;

        if (!toolIds || !Array.isArray(toolIds) || toolIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No tool IDs provided'
            });
        }

        const tools = engine.getToolsByIds(toolIds, budget);

        res.json({
            success: true,
            tools: monetization.monetizeTools(tools)
        });
    } catch (error) {
        console.error('[DECY] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Something went wrong. Please try again.'
        });
    }
});

/**
 * POST /api/generate-prompt
 * Generate an optimized prompt for a specific AI tool
 * Body: { toolId: string, toolName: string, description: string }
 */
app.post('/api/generate-prompt', async (req, res) => {
    try {
        const { toolId, toolName, description } = req.body;

        if (!toolName || !description) {
            return res.status(400).json({
                success: false,
                error: 'Tool name and description are required'
            });
        }

        const prompt = await engine.generatePromptForTool(toolId, toolName, description);

        res.json({
            success: true,
            prompt: prompt
        });
    } catch (error) {
        console.error('[DECY] Prompt generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate prompt. Please try again.'
        });
    }
});

/**
 * GET /api/product-strategy
 * Subscription-readiness and verified-tool strategy for DECY.
 */
app.get('/api/product-strategy', (req, res) => {
    try {
        res.json(engine.getProductStrategy());
    } catch (error) {
        console.error('[DECY] Strategy error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to build product strategy'
        });
    }
});

/**
 * GET /api/categories
 * Get all available categories
 */
app.get('/api/categories', (req, res) => {
    const tools = require('./data/tools.json');
    const categories = Object.entries(tools.categories).map(([key, cat]) => ({
        id: key,
        name: cat.name,
        icon: cat.icon,
        toolCount: cat.tools.length
    }));

    res.json({ categories });
});

/**
 * GET /api/tools/:category
 * Get tools by category
 */
app.get('/api/tools/:category', (req, res) => {
    const { category } = req.params;
    const { budget } = req.query;
    const tools = require('./data/tools.json');

    const categoryData = tools.categories[category];

    if (!categoryData) {
        return res.status(404).json({
            success: false,
            error: 'Category not found'
        });
    }

    let filteredTools = categoryData.tools;

    if (budget === 'free') {
        filteredTools = filteredTools.filter(t => t.pricing.free);
    }

    res.json({
        success: true,
        category: categoryData.name,
        tools: filteredTools
    });
});

// ============================================
//  SCRAPER API ROUTES - Auto Tool Discovery
// ============================================

/**
 * POST /api/discover/url
 * Discover a new AI tool by its website URL
 * Body: { url: string }
 */
app.post('/api/discover/url', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ success: false, error: 'URL is required' });
        }
        const result = await scraper.discoverToolByUrl(url);
        res.json(result);
    } catch (error) {
        console.error('[DECY] Discover error:', error);
        res.status(500).json({ success: false, error: 'Discovery failed' });
    }
});

/**
 * POST /api/discover/name
 * Discover a new AI tool by searching for its name
 * Body: { name: string }
 */
app.post('/api/discover/name', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, error: 'Tool name is required' });
        }
        const result = await scraper.discoverToolByName(name);
        res.json(result);
    } catch (error) {
        console.error('[DECY] Discover error:', error);
        res.status(500).json({ success: false, error: 'Discovery failed' });
    }
});

/**
 * POST /api/discover/scrape
 * Run a full scrape of AI tool directories
 * Returns: { discovered, added, skipped, errors }
 */
app.post('/api/discover/scrape', async (req, res) => {
    try {
        const results = await scraper.runFullScrape();
        res.json({ success: true, ...results });
    } catch (error) {
        console.error('[DECY] Scrape error:', error);
        res.status(500).json({ success: false, error: 'Scrape failed' });
    }
});

/**
 * GET /api/discover/stats
 * Get scraper stats
 */
app.get('/api/discover/stats', (req, res) => {
    const stats = scraper.getStats();
    res.json(stats);
});

/**
 * GET /api/discover/tools
 * Get full list of discovered tools
 */
app.get('/api/discover/tools', (req, res) => {
    try {
        const fs = require('fs');
        const discoveredPath = path.join(__dirname, 'data', 'discovered.json');
        const discovered = JSON.parse(fs.readFileSync(discoveredPath, 'utf-8'));
        res.json(discovered);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/tools/all
 * Get all tools from the database with category info
 */
app.get('/api/tools/all', (req, res) => {
    try {
        const fs = require('fs');
        const toolsPath = path.join(__dirname, 'data', 'tools.json');
        const data = JSON.parse(fs.readFileSync(toolsPath, 'utf-8'));

        const allTools = [];
        for (const [categoryKey, category] of Object.entries(data.categories)) {
            for (const tool of category.tools) {
                allTools.push({
                    ...tool,
                    categoryKey,
                    categoryName: category.name
                });
            }
        }

        res.json({
            totalTools: data.metadata.totalTools,
            lastUpdated: data.metadata.lastUpdated,
            categories: Object.keys(data.categories).length,
            tools: allTools
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/stacks
 * Get all pre-built AI stacks
 */
app.get('/api/stacks', (req, res) => {
    try {
        const stacks = require('./data/stacks.json');
        const stackList = Object.values(stacks.stacks).map(s => ({
            id: s.id,
            title: s.title,
            subtitle: s.subtitle,
            emoji: s.emoji,
            audience: s.audience,
            totalCost: s.totalCost,
            toolCount: s.tools.length
        }));
        res.json({ success: true, stacks: stackList });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to load stacks' });
    }
});

/**
 * GET /api/stacks/:id
 * Get a specific stack by ID
 */
app.get('/api/stacks/:id', (req, res) => {
    try {
        const stacks = require('./data/stacks.json');
        const stack = stacks.stacks[req.params.id];
        if (!stack) {
            return res.status(404).json({ success: false, error: 'Stack not found' });
        }
        res.json({ success: true, stack });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to load stack' });
    }
});

/**
 * Serve frontend
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/login.html'));
});

// SEO Landing Pages
const seoPages = [
    'best-ai-tools-for-students',
    'best-ai-tools-for-freelancers',
    'best-ai-tools-for-founders',
    'best-ai-tools-for-creators',
    'best-ai-tools-for-developers'
];

seoPages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(__dirname, `public/${page}.html`));
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🤖 DECY - AI Decision Assistant v2.0                    ║
║   ─────────────────────────────────────                   ║
║                                                           ║
║   Server:    http://localhost:${PORT}                       ║
║   API:       http://localhost:${PORT}/api/recommend         ║
║   Scraper:   http://localhost:${PORT}/api/discover/stats    ║
║                                                           ║
║   Groq:   ${process.env.GROQ_API_KEY ? '✅ Enabled' : '⚠️  Not configured'}                                  ║
║   Gemini: ${process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' ? '✅ Enabled' : '⚠️  Not configured'}                                  ║
║   Scraper: ✅ Ready                                       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
});
