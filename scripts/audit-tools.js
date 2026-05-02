const tools = require('../data/tools.json');
const curation = require('../data/curation.json');
const DecyIntelligence = require('../services/intelligence');

const intelligence = new DecyIntelligence(tools);
const allTools = intelligence.allToolsFlat;
const allIds = new Set(allTools.map(tool => tool.id));
const curatedIds = new Set(Object.keys(curation.tools || {}));

const issues = [];

for (const [categoryKey, category] of Object.entries(tools.categories)) {
    if (!Array.isArray(category.tools) || category.tools.length === 0) {
        issues.push(`[category_empty] ${categoryKey} has no tools`);
    }

    for (const tool of category.tools || []) {
        if (!tool.id || !tool.name || !tool.url || !tool.bestFor) {
            issues.push(`[missing_core_fields] ${categoryKey}/${tool.id || tool.name || 'unknown'}`);
        }
        if (!tool.pricing || typeof tool.pricing.free !== 'boolean') {
            issues.push(`[missing_pricing] ${categoryKey}/${tool.id}`);
        }
        if (!/^https?:\/\//.test(tool.url || '')) {
            issues.push(`[bad_url] ${categoryKey}/${tool.id}: ${tool.url}`);
        }
        if (!curatedIds.has(tool.id)) {
            continue;
        }
        const review = curation.tools[tool.id];
        if (!review.sourceUrl || !/^https?:\/\//.test(review.sourceUrl)) {
            issues.push(`[bad_curation_source] ${tool.id}`);
        }
        if (typeof review.score !== 'number' || review.score < 1 || review.score > 100) {
            issues.push(`[bad_curation_score] ${tool.id}`);
        }
    }
}

for (const pattern of intelligence.intentMap) {
    for (const priorityId of pattern.priority || []) {
        if (!allIds.has(priorityId)) {
            issues.push(`[missing_priority_tool] ${pattern.category} priority references "${priorityId}"`);
        }
    }
}

for (const curatedId of curatedIds) {
    if (!allIds.has(curatedId)) {
        issues.push(`[curation_orphan] ${curatedId} is curated but not present in tools.json`);
    }
}

const verifiedCount = Object.values(curation.tools || {}).filter(tool => tool.status === 'verified').length;

console.log(`DECY tool audit`);
console.log(`Categories: ${Object.keys(tools.categories).length}`);
console.log(`Tools: ${allTools.length}`);
console.log(`Verified overlays: ${verifiedCount}`);

if (issues.length > 0) {
    console.log(`Issues: ${issues.length}`);
    for (const issue of issues) {
        console.log(`- ${issue}`);
    }
    process.exitCode = 1;
} else {
    console.log('Issues: 0');
}
