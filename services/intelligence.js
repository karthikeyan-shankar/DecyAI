/**
 * DECY Intelligence Layer
 * Smart pre-filtering and context building for AI recommendations
 * This is what makes DECY actually understand user needs
 */

class DecyIntelligence {
    constructor(tools) {
        this.tools = tools;
        this.intentMap = this.buildIntentMap();
        this.allToolsFlat = this.flattenTools();

        // Load pre-built stacks
        try {
            this.stacksData = require('../data/stacks.json');
        } catch (e) {
            console.warn('[DECY] Could not load stacks.json:', e.message);
            this.stacksData = { stacks: {}, triggers: {} };
        }
    }

    /**
     * Detect if user is asking for a stack recommendation
     * Returns: { matched: true, stackId, stack } or { matched: false }
     */
    detectStack(message) {
        const lower = message.toLowerCase();

        // Direct stack request patterns
        const stackPatterns = [
            /build\s+(?:my|me|a)?\s*(?:ai\s+)?stack\s+(?:for\s+)?(?:a\s+)?(\w+)/i,
            /(?:ai\s+)?stack\s+for\s+(?:a\s+)?(\w+)/i,
            /i(?:'m| am)\s+(?:a\s+)?(\w+)/i,
            /tools?\s+for\s+(?:a\s+)?(\w+)/i,
            /best\s+(?:ai\s+)?tools?\s+for\s+(?:a\s+)?(\w+)/i,
            /recommend\s+(?:ai\s+)?tools?\s+for\s+(?:a\s+)?(\w+)/i,
            /what\s+(?:ai\s+)?tools?\s+(?:should|do|for)\s+(?:a\s+)?(\w+)/i,
        ];

        // Check direct patterns first
        for (const pattern of stackPatterns) {
            const match = lower.match(pattern);
            if (match) {
                const role = match[1].toLowerCase();
                for (const [stackId, triggers] of Object.entries(this.stacksData.triggers)) {
                    if (triggers.some(t => role.includes(t) || t.includes(role))) {
                        return {
                            matched: true,
                            stackId,
                            stack: this.stacksData.stacks[stackId]
                        };
                    }
                }
            }
        }

        // Check keyword-based matching
        let bestMatch = null;
        let bestScore = 0;

        for (const [stackId, triggers] of Object.entries(this.stacksData.triggers)) {
            let score = 0;
            for (const trigger of triggers) {
                if (lower.includes(trigger)) {
                    score += trigger.length; // Longer matches = more specific = better
                }
            }
            if (score > bestScore) {
                bestScore = score;
                bestMatch = stackId;
            }
        }

        if (bestMatch && bestScore >= 5) {
            return {
                matched: true,
                stackId: bestMatch,
                stack: this.stacksData.stacks[bestMatch]
            };
        }

        return { matched: false };
    }

    /**
     * Get all available stacks for the browse view
     */
    getAllStacks() {
        return Object.values(this.stacksData.stacks);
    }

    /**
     * Flatten all tools into a single searchable array with category info
     */
    flattenTools() {
        const flat = [];
        for (const [catKey, cat] of Object.entries(this.tools.categories)) {
            for (const tool of cat.tools) {
                flat.push({
                    ...tool,
                    categoryKey: catKey,
                    categoryName: cat.name,
                    categoryKeywords: cat.keywords || [],
                    // Build searchable text for matching
                    searchText: [
                        tool.name,
                        tool.bestFor,
                        tool.whySuitsYou || '',
                        tool.limits || '',
                        ...(cat.keywords || [])
                    ].join(' ').toLowerCase()
                });
            }
        }
        return flat;
    }

    /**
     * Intent mapping — maps real user language to tool categories and use cases
     * This is the "brain" that understands what users actually mean
     */
    buildIntentMap() {
        return [
            // === BUILDING / CREATING ===
            {
                intents: ['portfolio', 'personal website', 'personal site', 'showcase my work', 'online presence'],
                category: 'app_building',
                context: 'The user wants to build a personal portfolio website to showcase their work. Recommend app/website builders that are easy to use and produce professional-looking sites.',
                priority: ['lovable', 'bolt', 'v0']
            },
            {
                intents: ['landing page', 'saas', 'startup website', 'product page', 'business website'],
                category: 'app_building',
                context: 'The user wants to build a professional landing page or business website. Recommend tools that can create polished, conversion-optimized pages.',
                priority: ['lovable', 'bolt', 'v0']
            },
            {
                intents: ['app', 'mobile app', 'web app', 'build app', 'create app', 'develop app', 'mvp', 'prototype', 'dashboard', 'internal tool', 'client portal', 'booking system', 'marketplace'],
                category: 'app_building',
                context: 'The user wants to build a functional application. Recommend no-code/low-code builders that can create real, deployable apps.',
                priority: ['lovable', 'bolt', 'replit']
            },

            // === VISUAL CONTENT ===
            {
                intents: ['logo', 'brand identity', 'branding', 'brand kit', 'company logo'],
                category: 'design',
                context: 'The user needs logo/branding design. Recommend AI tools specifically built for logo creation.',
                priority: ['looka', 'canva_design', 'kittl']
            },
            {
                intents: ['poster', 'flyer', 'banner', 'social media post', 'instagram post', 'thumbnail', 'cover image', 'marketing material', 'ad creative', 'brochure', 'invitation', 'menu design'],
                category: 'design',
                context: 'The user wants to create visual marketing content. Recommend design tools with templates for social media and marketing.',
                priority: ['canva_design', 'kittl', 'figma']
            },
            {
                intents: ['ui design', 'wireframe', 'mockup', 'prototype design', 'user interface', 'figma'],
                category: 'design',
                context: 'The user needs to design user interfaces or wireframes. Recommend professional UI/UX design tools.',
                priority: ['figma', 'uizard', 'canva_design']
            },

            // === IMAGE GENERATION ===
            {
                intents: ['generate image', 'create image', 'ai art', 'artwork', 'illustration', 'picture', 'image generation', 'ai image', 'draw'],
                category: 'image_generation',
                context: 'The user wants to generate images from text descriptions. Recommend AI image generators.',
                priority: ['ideogram', 'leonardo', 'midjourney']
            },
            {
                intents: ['edit photo', 'remove background', 'enhance photo', 'photo editing', 'retouch', 'upscale image'],
                category: 'image_editing',
                context: 'The user wants to edit or enhance existing photos. Recommend photo editing AI tools.',
                priority: ['canva', 'remove_bg', 'clipdrop']
            },

            // === VIDEO ===
            {
                intents: ['video', 'edit video', 'reel', 'short', 'youtube', 'tiktok', 'clip', 'montage', 'subtitles', 'captions', 'podcast clips', 'long video to shorts'],
                category: 'video_creation',
                context: 'The user wants to create or edit video content. Recommend video editing tools.',
                priority: ['capcut', 'descript', 'invideo']
            },
            {
                intents: ['generate video', 'text to video', 'ai video', 'animate', 'motion', 'video from text'],
                category: 'video_creation',
                context: 'The user wants to generate video from text or images using AI. Recommend AI video generators.',
                priority: ['runway', 'pika', 'invideo']
            },
            {
                intents: ['talking head', 'avatar video', 'spokesperson', 'virtual presenter'],
                category: 'video_creation',
                context: 'The user wants AI-generated talking head or avatar videos. Recommend avatar video tools.',
                priority: ['heygen', 'synthesia', 'invideo']
            },

            // === WRITING ===
            {
                intents: ['write', 'blog', 'article', 'essay', 'content', 'copywriting', 'email', 'marketing copy', 'caption', 'linkedin post', 'product description', 'script'],
                category: 'writing',
                context: 'The user wants to write or generate text content. Recommend AI writing tools.',
                priority: ['notion_ai', 'copy_ai', 'jasper']
            },
            {
                intents: ['grammar', 'proofread', 'spelling', 'editing text', 'paraphrase', 'rewrite'],
                category: 'writing',
                context: 'The user wants to check grammar, paraphrase, or improve existing text. Recommend editing/grammar tools.',
                priority: ['grammarly', 'quillbot', 'wordtune']
            },

            // === CODING ===
            {
                intents: ['code', 'programming', 'debug', 'developer', 'coding assistant', 'autocomplete', 'copilot', 'fix bug', 'explain code', 'generate code', 'api integration'],
                category: 'coding_assistance',
                context: 'The user needs help with coding or programming. Recommend AI coding assistants.',
                priority: ['cursor', 'github_copilot', 'chatgpt']
            },

            // === PRESENTATIONS ===
            {
                intents: ['presentation', 'slides', 'pitch deck', 'ppt', 'powerpoint', 'keynote', 'slide deck'],
                category: 'presentation',
                context: 'The user wants to create a presentation or slide deck. Recommend AI presentation tools.',
                priority: ['gamma', 'tome', 'beautiful_ai']
            },

            // === AUDIO ===
            {
                intents: ['voice', 'voiceover', 'text to speech', 'narration', 'dubbing', 'voice clone'],
                category: 'audio',
                context: 'The user needs text-to-speech, voiceovers, or voice generation. Recommend voice AI tools.',
                priority: ['elevenlabs', 'murf', 'speechify']
            },
            {
                intents: ['music', 'song', 'beat', 'soundtrack', 'jingle', 'compose'],
                category: 'music_generation',
                context: 'The user wants to create music or audio content. Recommend AI music tools.',
                priority: ['suno', 'udio', 'aiva']
            },

            // === PRODUCTIVITY ===
            {
                intents: ['meeting notes', 'transcribe', 'summarize meeting', 'meeting summary'],
                category: 'automation',
                context: 'The user wants to transcribe or summarize meetings. Recommend meeting AI tools.',
                priority: ['granola', 'otter_ai', 'fireflies_ai']
            },
            {
                intents: ['research', 'find information', 'academic', 'papers', 'study', 'sources', 'citations', 'summarize pdf', 'learn topic', 'competitor research', 'market research'],
                category: 'research',
                context: 'The user needs help with research or finding information. Recommend AI research tools.',
                priority: ['perplexity', 'elicit', 'semantic_scholar']
            },

            // === AUTOMATION ===
            {
                intents: ['automate', 'automation', 'workflow', 'connect apps', 'zapier', 'crm', 'lead capture', 'send emails', 'sync data', 'calendar scheduling'],
                category: 'automation',
                context: 'The user wants to automate repetitive work or connect tools together. Recommend automation platforms that save time.',
                priority: ['zapier', 'make', 'notion_automations']
            },

            // === RESUME (special - crosses categories) ===
            {
                intents: ['resume', 'cv', 'cover letter', 'job application'],
                category: 'design',
                context: 'The user wants to create a resume or CV. Recommend design tools with resume templates, AND website builders for online portfolios.',
                priority: ['canva_design', 'lovable', 'notion_ai']
            }
        ];
    }

    /**
     * THE CORE: Understand what the user wants and find the best tools
     * Returns: { matchedTools: [], context: string, confidence: number }
     */
    analyzeIntent(userMessage) {
        const query = userMessage.toLowerCase().trim();

        // FIRST: Check if user is asking for guidance on a SPECIFIC tool
        const guidance = this.detectToolGuidance(query);
        if (guidance) {
            return guidance;
        }

        const words = query
            .replace(/[^\w\s-]/g, ' ')
            .split(/\s+/)
            .filter(Boolean);

        let bestMatch = null;
        let bestScore = 0;

        // Score each intent pattern
        for (const pattern of this.intentMap) {
            let score = 0;

            for (const intent of pattern.intents) {
                // Exact phrase match (strongest signal)
                if (query.includes(intent)) {
                    score += 20;
                }
                // Individual word matches
                const intentWords = intent.split(' ');
                for (const iw of intentWords) {
                    if (iw.length < 3) continue;
                    if (words.includes(iw)) {
                        score += 5;
                    }
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestMatch = pattern;
            }
        }

        // If we found a strong match, get the tools
        if (bestMatch && bestScore >= 5) {
            // Get priority tools first, then fill with category tools
            const relevantTools = this.getRelevantTools(bestMatch, query);

            return {
                matched: true,
                category: bestMatch.category,
                context: bestMatch.context,
                confidence: Math.min(bestScore / 20, 1),
                tools: relevantTools
            };
        }

        // Fallback: search all tools by keywords
        const fallbackTools = this.searchAllTools(query);
        if (fallbackTools.length > 0) {
            return {
                matched: true,
                category: 'mixed',
                context: `The user is looking for: "${query}". Found tools by keyword match.`,
                confidence: 0.3,
                tools: fallbackTools.slice(0, 6)
            };
        }

        return {
            matched: false,
            category: null,
            context: 'Could not determine specific tool needs from the message.',
            confidence: 0,
            tools: []
        };
    }

    /**
     * Detect when user is asking HOW TO USE a specific tool
     * e.g., "how to create an app using lovable", "how to use bolt", "guide me on figma"
     */
    detectToolGuidance(query) {
        // Guidance signal words
        const guidanceSignals = [
            'how to use', 'how to create', 'how to build', 'how to make',
            'how do i use', 'how does', 'guide me', 'teach me', 'help me use',
            'steps to use', 'tutorial', 'how to start with', 'getting started',
            'using the', 'using it', 'how can i use', 'what can i do with',
            'tips for', 'how to get started'
        ];

        const hasGuidanceSignal = guidanceSignals.some(signal => query.includes(signal));
        if (!hasGuidanceSignal) return null;

        // Look for a specific tool name in the query
        for (const tool of this.allToolsFlat) {
            const toolName = tool.name.toLowerCase();
            const toolId = tool.id.toLowerCase();

            if (query.includes(toolName) || query.includes(toolId)) {
                return {
                    matched: true,
                    isGuidance: true,
                    category: tool.categoryKey,
                    tool: tool,
                    context: `The user is asking for guidance on HOW TO USE ${tool.name}. DO NOT recommend other tools. Instead, give a clear step-by-step guide on how to use ${tool.name} effectively. Include: 1) How to get started 2) Key features to use 3) Tips for best results. Tool details: ${tool.bestFor}. URL: ${tool.url}`,
                    confidence: 1.0,
                    tools: [tool]
                };
            }
        }

        return null;
    }

    /**
     * Get relevant tools for a matched intent pattern
     */
    getRelevantTools(pattern, query) {
        const tools = [];
        const addedIds = new Set();

        // 1. Add priority tools first (the best picks)
        for (const priorityId of pattern.priority) {
            const tool = this.allToolsFlat.find(t => t.id === priorityId);
            if (tool && !addedIds.has(tool.id)) {
                tools.push(tool);
                addedIds.add(tool.id);
            }
        }

        // 2. Add more tools from the same category
        const categoryTools = this.allToolsFlat
            .filter(t => t.categoryKey === pattern.category && !addedIds.has(t.id))
            .sort((a, b) => (b.ease || 3) - (a.ease || 3));

        for (const tool of categoryTools) {
            if (tools.length >= 6) break;
            tools.push(tool);
            addedIds.add(tool.id);
        }

        return tools;
    }

    /**
     * Search all tools by keyword matching (fallback)
     */
    searchAllTools(query) {
        const queryWords = query.toLowerCase().split(/\s+/);
        const scored = [];

        for (const tool of this.allToolsFlat) {
            let score = 0;
            for (const word of queryWords) {
                if (word.length < 3) continue; // Skip tiny words
                if (tool.searchText.includes(word)) {
                    score += 5;
                }
                if (tool.name.toLowerCase().includes(word)) {
                    score += 15;
                }
            }
            if (score > 0) {
                scored.push({ ...tool, matchScore: score });
            }
        }

        return scored
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 6);
    }

    /**
     * Build rich context for the AI about matched tools
     * This is what makes the AI actually KNOW the tools
     */
    buildToolContext(matchedTools) {
        if (matchedTools.length === 0) return 'No specific tools matched.';

        return matchedTools.map((tool, i) => {
            const pricing = tool.pricing?.free ? 'Free tier available' : (tool.pricing?.premium || 'Paid');
            const premium = tool.pricing?.premium ? ` | Premium: ${tool.pricing.premium}` : '';
            return `${i + 1}. **${tool.name}** (ID: ${tool.id})
   - Best for: ${tool.bestFor}
   - Why it suits: ${tool.whySuitsYou || 'Great option'}
   - Pricing: ${pricing}${premium}
   - Ease of use: ${tool.ease || 3}/5
   - Limits: ${tool.limits || 'Check website'}`;
        }).join('\n\n');
    }

    /**
     * Generate SMART follow-up suggestions based on actual recommended tools + user query
     * These are contextual — not random category suggestions
     */
    getFollowUpSuggestions(category, toolIds = [], userQuery = '') {
        const suggestions = [];

        // 1. ALWAYS: Offer guidance on the #1 recommended tool
        if (toolIds.length > 0) {
            const topTool = this.allToolsFlat.find(t => t.id === toolIds[0]);
            if (topTool) {
                suggestions.push({
                    text: `📋 How to use ${topTool.name}`,
                    message: `How to use ${topTool.name}`
                });
            }
        }

        // 2. ALWAYS: Offer a workflow for what they're trying to do
        if (userQuery) {
            suggestions.push({
                text: `🚀 Full workflow for this`,
                message: `Give me a complete step-by-step workflow to ${userQuery}`
            });
        }

        // 3. Offer a ready-to-use prompt for the top tool
        if (toolIds.length > 0) {
            const topTool = this.allToolsFlat.find(t => t.id === toolIds[0]);
            if (topTool && topTool.acceptsPrompt) {
                suggestions.push({
                    text: `✨ Get a prompt for ${topTool.name}`,
                    message: `Give me a ready-to-use prompt for ${topTool.name} to ${userQuery || 'get started'}`
                });
            }
        }

        // 4. If we have a second tool, offer to compare
        if (toolIds.length > 1) {
            const tool1 = this.allToolsFlat.find(t => t.id === toolIds[0]);
            const tool2 = this.allToolsFlat.find(t => t.id === toolIds[1]);
            if (tool1 && tool2 && suggestions.length < 3) {
                suggestions.push({
                    text: `⚖️ Compare ${tool1.name} vs ${tool2.name}`,
                    message: `Compare ${tool1.name} vs ${tool2.name} - which is better for me?`
                });
            }
        }

        // Return max 3 suggestions
        return suggestions.slice(0, 3);
    }
}

module.exports = DecyIntelligence;

