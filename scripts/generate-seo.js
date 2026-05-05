const fs = require('fs');
const path = require('path');
const stacksData = require('../data/stacks.json');

const template = fs.readFileSync(path.join(__dirname, '../public/best-ai-tools-for-students.html'), 'utf-8');

const stacks = [
    {
        id: 'freelancer',
        slug: 'best-ai-tools-for-freelancers',
        keyword: 'freelancers',
        title: 'Best Free AI Tools for Freelancers in 2026 | DECY',
        h1: 'The Only 5 <span>AI Tools</span> You Need as a Freelancer',
        desc: "Stop wasting time on admin work. Here's a curated, tested AI stack that covers lead generation, proposals, execution, invoicing, and client management — all with free tiers.",
        metaDesc: "Discover the 5 best free AI tools every freelancer needs in 2026. Save time on proposals, client management, and execution with this curated freelance stack.",
        heroText: "Stop wasting time on admin work. Here's a curated, tested AI stack that covers lead generation, proposals, execution, and client management."
    },
    {
        id: 'founder',
        slug: 'best-ai-tools-for-founders',
        keyword: 'founders',
        title: 'Best Free AI Tools for Startup Founders in 2026 | DECY',
        h1: 'The Only 5 <span>AI Tools</span> You Need as a Startup Founder',
        desc: "Launch faster with less capital. Here's a curated AI stack for market research, pitch decks, MVP building, and marketing — all with generous free tiers.",
        metaDesc: "Discover the 5 best free AI tools every startup founder needs in 2026. Validate ideas, build MVPs, and launch faster without spending money.",
        heroText: "Launch faster with less capital. Here's a curated AI stack for market research, pitch decks, MVP building, and marketing."
    },
    {
        id: 'creator',
        slug: 'best-ai-tools-for-creators',
        keyword: 'creators',
        title: 'Best Free AI Tools for Content Creators in 2026 | DECY',
        h1: 'The Only 5 <span>AI Tools</span> You Need as a Content Creator',
        desc: "Beat the algorithm and prevent burnout. Here's your complete AI stack for ideation, scripting, editing, thumbnails, and distribution.",
        metaDesc: "Discover the 5 best free AI tools every content creator needs in 2026. Scripts, video editing, thumbnails, and social media scheduling made easy.",
        heroText: "Beat the algorithm and prevent burnout. Here's your complete AI stack for ideation, scripting, editing, thumbnails, and distribution."
    },
    {
        id: 'developer',
        slug: 'best-ai-tools-for-developers',
        keyword: 'developers',
        title: 'Best Free AI Tools for Developers in 2026 | DECY',
        h1: 'The Only 5 <span>AI Tools</span> You Need as a Developer',
        desc: "Code faster and ship sooner. Here's the ultimate AI stack for architecture, pair programming, debugging, deployment, and documentation.",
        metaDesc: "Discover the 5 best free AI tools every software developer needs in 2026. AI pair programming, architecture planning, and automated deployment.",
        heroText: "Code faster and ship sooner. Here's the ultimate AI stack for architecture, pair programming, debugging, deployment, and documentation."
    }
];

function generateToolHTML(tool, index) {
    return `
            <article class="tool-card">
                <div class="tool-header">
                    <div class="step-num">${index + 1}</div>
                    <div>
                        <div class="tool-role">${tool.role}</div>
                        <h3 class="tool-name">${tool.name}</h3>
                    </div>
                </div>
                <p class="tool-desc">${tool.description}</p>
                <div class="tool-meta">
                    <span class="tag tag-free">${tool.freeLimit}</span>
                </div>
                <div class="prompt-box">
                    <div class="prompt-label">Ready-to-use prompt</div>
                    "${tool.prompt}"
                </div>
                <a href="${tool.link}" target="_blank" rel="noopener" class="tool-link">Visit ${tool.name} →</a>
            </article>`;
}

stacks.forEach(config => {
    let html = template;
    const stackData = stacksData.stacks[config.id];

    // Replace Meta
    html = html.replace(/<title>.*?<\/title>/, `<title>${config.title}</title>`);
    html = html.replace(/<meta name="description" content=".*?"\/>/, `<meta name="description" content="${config.metaDesc}"/>`);
    html = html.replace(/<meta property="og:title" content=".*?"\/>/, `<meta property="og:title" content="${config.title}"/>`);
    html = html.replace(/<meta property="og:description" content=".*?"\/>/, `<meta property="og:description" content="${config.metaDesc}"/>`);
    html = html.replace(/<meta property="og:url" content=".*?"\/>/, `<meta property="og:url" content="https://decyai.vercel.app/${config.slug}"/>`);
    html = html.replace(/<link rel="canonical" href=".*?"\/>/, `<link rel="canonical" href="https://decyai.vercel.app/${config.slug}"/>`);
    
    // Replace JSON-LD
    html = html.replace(/"headline": ".*?"/, `"headline": "${config.title}"`);
    html = html.replace(/"description": ".*?",\n.*?"author"/, `"description": "${config.metaDesc}",\n        "author"`);

    // Replace Breadcrumb
    html = html.replace(/<span>.*?<\/span>/, `<span>Best AI Tools for ${config.keyword.charAt(0).toUpperCase() + config.keyword.slice(1)}</span>`);

    // Replace Hero
    html = html.replace(/<h1>.*?<\/h1>/, `<h1>${config.h1}</h1>`);
    html = html.replace(/<p>Stop wasting time searching.*?<\/p>/, `<p>${config.heroText}</p>`);
    
    // Replace Section Title
    html = html.replace(/<h2 class="section-title">Your Complete.*?<\/h2>/, `<h2 class="section-title">Your Complete ${config.keyword.charAt(0).toUpperCase() + config.keyword.slice(1)} AI Stack</h2>`);

    // Replace Tools
    const toolsHTML = stackData.tools.map((t, i) => generateToolHTML(t, i)).join('\n');
    html = html.replace(/<article class="tool-card">[\s\S]*?<\/section>/, toolsHTML + '\n        </section>');

    fs.writeFileSync(path.join(__dirname, '../public', `${config.slug}.html`), html);
    console.log(`Generated ${config.slug}.html`);
});
