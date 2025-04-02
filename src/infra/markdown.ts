import showdown from "showdown";

const converter = new showdown.Converter({
    literalMidWordUnderscores: true,
})

// const converter = new showdown.Converter({
//     extensions: [],
//     strikethrough: true,
//     tasklists: true,
//     tables: true,
//     simplifiedAutoLink: true,
//     encodeEmails: false,
//     openLinksInNewWindow: false,
//     backslashEscapesHTMLTags: false,
//     emoji: true,
//     underline: true,
//     ghMentions: false,
//     ghMentionsLink: "",
//     excludeTrailingPunctuationFromURLs: true,
//     ghCodeBlocks: true,
//     // Don't parse $$ blocks to allow MathJax to handle them
//     literalMidWordUnderscores: true,
//     simpleLineBreaks: true
// });

export function parseMarkdownToHtml(markdown: string): string {
    return converter.makeHtml(markdown);
}