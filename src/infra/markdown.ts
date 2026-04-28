import showdown from "showdown";
import { codeToHtml, bundledLanguages } from "shiki";

const converter = new showdown.Converter({
    literalMidWordUnderscores: true,
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
    return SUPPORTED_LANGS.has(lang) ? lang : "text";
}

async function highlightCodeBlocks(html: string): Promise<string> {
    const matches = Array.from(html.matchAll(CODE_BLOCK_RE));
    if (matches.length === 0) return html;

    const replacements = await Promise.all(
        matches.map(async (m) => {
            const code = decodeEntities(m[2]);
            const lang = extractLang(m[1]);
            const highlighted = await codeToHtml(code, {
                lang,
                themes: { light: "github-light", dark: "github-dark" },
                defaultColor: false,
            });
            return { original: m[0], replacement: highlighted };
        }),
    );

    let result = html;
    for (const { original, replacement } of replacements) {
        result = result.replace(original, () => replacement);
    }
    return result;
}

export async function parseMarkdownToHtml(markdown: string): Promise<string> {
    const html = converter.makeHtml(markdown);
    return highlightCodeBlocks(html);
}
