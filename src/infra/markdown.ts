import showdown from "showdown";
import { codeToHtml, bundledLanguages } from "shiki";

const converter = new showdown.Converter({
    literalMidWordUnderscores: true,
    ghCompatibleHeaderId: true,
    tables: true,
})

const SUPPORTED_LANGS = new Set(Object.keys(bundledLanguages));
// Capture groups: 1 = class attribute (optional), 2 = code body
const CODE_BLOCK_RE = /<pre><code(?:\s+class="([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g;

function decodeEntities(html: string): string {
    return html
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&");
}

function extractLang(cls: string | undefined): string {
    if (!cls) return "text";
    const match = cls.match(/language-([\w+-]+)/);
    if (!match) return "text";
    const lang = match[1].toLowerCase();

    if (lang === "mermaid") return "mermaid"; // mermaid is not supported by shiki
    return SUPPORTED_LANGS.has(lang) ? lang : "text";
}

async function createCodeBlock(lang: string, code: string): Promise<string> {
    const highlighted = await codeToHtml(code, {
        lang,
        themes: { light: "github-light", dark: "github-dark" },
        defaultColor: false,
    });
    const showLang = lang !== "text";
    return `<figure class="code-block"><div class="code-block-header"><span class="code-lang" data-empty="${!showLang}">${showLang ? lang : ""}</span><button class="code-copy" type="button" aria-label="Copy code">Copy</button></div>${highlighted}</figure>`;
}

function createMermaidBlock(code: string): string {
    return `<figure class="mermaid-block"><button class="mermaid-fullscreen" type="button" aria-label="View fullscreen">⛶</button><pre class="mermaid">${code}</pre></figure>`;
}

async function highlightCodeBlocks(html: string): Promise<string> {
    const matches = Array.from(html.matchAll(CODE_BLOCK_RE));
    if (matches.length === 0) return html;

    const replacements = await Promise.all(
        matches.map(async (m) => {
            const code = decodeEntities(m[2]);
            const lang = extractLang(m[1]);
            const replacement = lang === "mermaid"
                ? createMermaidBlock(code)
                : await createCodeBlock(lang, code);
            return { original: m[0], replacement };
        }),
    );

    let result = html;
    for (const { original, replacement } of replacements) {
        result = result.replace(original, () => replacement);
    }
    return result;
}

// Showdown wraps the `<details>`/`<summary>`/`</details>` tag lines of an
// authored collapsible block in stray `<p>` tags (the markdown *inside* the
// block is still parsed correctly). Unwrap those tags so the block is valid.
function unwrapDetailsParagraphs(html: string): string {
    return html
        .replace(
            /<p>\s*(<details(?:\s[^>]*)?>\s*<summary>[\s\S]*?<\/summary>)\s*<\/p>/g,
            "$1",
        )
        .replace(/<p>\s*<\/details>\s*<\/p>/g, "</details>");
}

// Showdown's markdown-inside-raw-HTML path (used for authored `<details>`
// blocks) breaks a fenced code block at any internal blank line, re-parsing the
// remainder as an indented code block. Mermaid ignores blank lines, so strip
// them from mermaid fences to keep diagrams intact inside collapsible blocks.
// (Only mermaid — real code blocks rely on blank lines for readability.)
const MERMAID_FENCE_RE = /^([ \t]*)```mermaid[ \t]*\n([\s\S]*?)\n[ \t]*```[ \t]*$/gm;

function stripBlankLinesInMermaidFences(markdown: string): string {
    return markdown.replace(MERMAID_FENCE_RE, (_m, indent: string, body: string) => {
        const cleaned = body
            .split("\n")
            .filter((line) => line.trim() !== "")
            .join("\n");
        return `${indent}\`\`\`mermaid\n${cleaned}\n${indent}\`\`\``;
    });
}

export async function parseMarkdownToHtml(markdown: string): Promise<string> {
    const prepared = stripBlankLinesInMermaidFences(markdown);
    const html = converter.makeHtml(prepared);
    const unwrapped = unwrapDetailsParagraphs(html);
    return highlightCodeBlocks(unwrapped);
}

export type TocItem = {
    id: string;
    text: string;
    level: 1 | 2 | 3;
};

const HEADING_RE = /<h([1-3])\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g;

function stripTags(html: string): string {
    return html.replace(/<[^>]+>/g, "").trim();
}

export function extractToc(html: string): TocItem[] {
    const items: TocItem[] = [];
    for (const m of html.matchAll(HEADING_RE)) {
        const level = parseInt(m[1], 10) as 1 | 2 | 3;
        items.push({ level, id: m[2], text: stripTags(m[3]) });
    }
    return items;
}

const WORDS_PER_MINUTE = 200;

export function estimateReadingMinutes(markdown: string): number {
    // Strip code blocks: prose word count drives reading speed, not source code
    const stripped = markdown
        .replace(/```[\s\S]*?```/g, "")
        .replace(/`[^`]*`/g, "");
    const words = stripped.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
