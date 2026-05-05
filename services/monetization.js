/**
 * DECY Monetization Engine
 * Intercepts tool recommendations and injects high-converting affiliate links.
 * Converts organic platform usage into actual revenue.
 */

class MonetizationEngine {
    constructor() {
        // Pre-configured affiliate links for high-converting tools
        this.affiliateMap = {
            'notion': 'https://affiliate.notion.so/decyai',
            'perplexity': 'https://perplexity.ai/pro?referral=DECY',
            'midjourney': 'https://midjourney.com/?via=decy',
            'canva': 'https://partner.canva.com/decy',
            'framer': 'https://framer.com/?via=decyai',
            'runway': 'https://runwayml.com/?ref=decy',
            'elevenlabs': 'https://elevenlabs.io/?via=decy',
            'descript': 'https://get.descript.com/decy',
            'jasper': 'https://jasper.ai/?utm_source=partner&utm_medium=decy',
            'copy_ai': 'https://copy.ai/?via=decy',
            'cursor': 'https://cursor.sh/?ref=decy',
            'gamma': 'https://gamma.app/?via=decy',
            'lovable': 'https://lovable.dev/?via=decy',
            'bolt': 'https://bolt.new/?via=decy',
            'v0': 'https://v0.dev/?via=decy'
        };
    }

    /**
     * Injects affiliate links into a single tool object
     */
    monetizeTool(tool) {
        if (!tool || !tool.url) return tool;

        const monetizedTool = { ...tool };
        const toolId = (tool.id || tool.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        // 1. Check if we have a direct affiliate partnership
        for (const [key, affiliateUrl] of Object.entries(this.affiliateMap)) {
            if (toolId.includes(key) || (tool.url && tool.url.toLowerCase().includes(key))) {
                monetizedTool.url = affiliateUrl;
                monetizedTool.isAffiliate = true;
                return monetizedTool;
            }
        }

        // 2. Generic fallback - append utm tags so tools see DECY as the traffic source
        // (Helps in negotiating future affiliate deals by proving traffic)
        try {
            if (tool.url.startsWith('http')) {
                const urlObj = new URL(tool.url);
                if (!urlObj.searchParams.has('utm_source')) {
                    urlObj.searchParams.append('utm_source', 'decy_ai');
                    urlObj.searchParams.append('utm_medium', 'referral');
                    monetizedTool.url = urlObj.toString();
                }
            }
        } catch (e) {
            // Ignore invalid URLs
        }

        return monetizedTool;
    }

    /**
     * Injects affiliate links into an array of tools
     */
    monetizeTools(tools) {
        if (!tools || !Array.isArray(tools)) return tools;
        return tools.map(tool => this.monetizeTool(tool));
    }

    /**
     * Deeply inspects and injects affiliate links into any API response payload
     */
    monetizeResponse(response) {
        if (!response) return response;

        // Clone the response to avoid mutating the original
        const monetized = JSON.parse(JSON.stringify(response));

        // If payload contains an array of raw tools
        if (monetized.tools && Array.isArray(monetized.tools)) {
            monetized.tools = this.monetizeTools(monetized.tools);
        }

        // If payload is a specific Stack Build
        if (monetized.stack && Array.isArray(monetized.stack)) {
            monetized.stack = monetized.stack.map(step => {
                if (step.tool) step.tool = this.monetizeTool(step.tool);
                return step;
            });
        }

        // If payload is multiple Stacks (Browse feature)
        if (monetized.stacks && Array.isArray(monetized.stacks)) {
            monetized.stacks = monetized.stacks.map(stack => {
                if (stack.tools) stack.tools = this.monetizeTools(stack.tools);
                return stack;
            });
        }
        
        // If payload contains a specific guide with a tool attached
        if (monetized.tool) {
            monetized.tool = this.monetizeTool(monetized.tool);
        }

        return monetized;
    }
}

module.exports = new MonetizationEngine();
