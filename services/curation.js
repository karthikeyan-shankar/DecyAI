const fs = require('fs');
const path = require('path');

class CurationService {
    constructor() {
        this.curationPath = path.join(__dirname, '..', 'data', 'curation.json');
        this.data = this.loadCuration();
    }

    loadCuration() {
        try {
            return JSON.parse(fs.readFileSync(this.curationPath, 'utf-8'));
        } catch (error) {
            console.warn('[DECY] Curation data unavailable:', error.message);
            return { metadata: {}, tools: {} };
        }
    }

    getToolCuration(toolId) {
        return this.data.tools?.[toolId] || null;
    }

    enrichTool(tool, options = {}) {
        if (!tool) return tool;

        const curation = this.getToolCuration(tool.id);
        const fitScore = this.calculateFitScore(tool, curation, options.rank || 0);

        return {
            ...tool,
            decyScore: fitScore,
            trust: {
                status: curation?.status || 'needs_review',
                verified: curation?.status === 'verified',
                score: curation?.score || fitScore,
                confidence: curation?.confidence || 0.55,
                sourceUrl: curation?.sourceUrl || tool.url,
                lastReviewed: this.data.metadata?.lastReviewed || null,
                reasons: curation?.reasons || this.defaultReasons(tool),
                bestPaidUse: curation?.bestPaidUse || tool.bestFor
            }
        };
    }

    enrichTools(tools, options = {}) {
        return tools.map((tool, index) => this.enrichTool(tool, { ...options, rank: index }));
    }

    calculateFitScore(tool, curation, rank) {
        let score = curation?.score || 65;

        if (tool.pricing?.free) score += 4;
        if ((tool.ease || 3) >= 5) score += 4;
        if (tool.acceptsPrompt) score += 3;
        if (tool.deploy?.available) score += 2;
        score -= Math.min(rank * 3, 12);

        return Math.max(1, Math.min(100, Math.round(score)));
    }

    defaultReasons(tool) {
        const reasons = [];
        if (tool.pricing?.free) reasons.push('Has a free tier');
        if ((tool.ease || 3) >= 4) reasons.push('Beginner-friendly');
        if (tool.acceptsPrompt) reasons.push('Works well from a clear prompt');
        if (reasons.length === 0) reasons.push('Potentially useful but needs manual review');
        return reasons;
    }

    getVerifiedTools() {
        return Object.entries(this.data.tools || {})
            .filter(([, value]) => value.status === 'verified')
            .map(([id, value]) => ({ id, ...value }))
            .sort((a, b) => b.score - a.score);
    }

    getStrategySummary() {
        return {
            ideaVerdict: 'Promising, but only as a verified decision assistant rather than a generic AI tools directory.',
            subscriptionReadiness: 'medium',
            reason: 'The market is crowded with AI tool directories, so users will pay only if DecyAI saves decision time with verified picks, comparisons, workflows, and prompt packs.',
            strongestDifferentiators: [
                'Verified worthiness score for each recommended tool',
                'Task-to-workflow recommendations instead of category browsing',
                'Ready-to-use prompts for the chosen tool',
                'Tool comparison and alternatives',
                'Freshness and trust labels'
            ],
            subscriptionIdeas: [
                {
                    plan: 'Free',
                    price: '$0',
                    value: 'Basic recommendations, 3 tools per search, limited prompt generation.'
                },
                {
                    plan: 'Pro',
                    price: '$7-12/month',
                    value: 'Unlimited recommendations, verified tool scores, workflows, comparisons, prompt packs, saved stacks.'
                },
                {
                    plan: 'Team',
                    price: '$19-29/user/month',
                    value: 'Team AI stack audits, shared workflows, admin-approved tools, and automation playbooks.'
                }
            ],
            whatMustBeVerifiedBeforeCharging: [
                'Pricing/free-tier availability',
                'Tool website still works',
                'Best use case is accurate',
                'Whether the tool is meaningfully better than alternatives',
                'Any limits that would surprise a user'
            ]
        };
    }
}

module.exports = CurationService;
