/** @typedef {{ type: "text", props: { text: string } }} TextSegment */
/** @typedef {{ type: "image", props: { src: string, alt?: string } }} ImageSegment */
/** @typedef {{ type: "link", props: { url: string, text: string } }} LinkSegment */
/** @typedef {{ type: "bold", props: { text: string } }} BoldTextSegment */
/** @typedef {{ type: "italic", props: { text: string } }} ItalicTextSegment */
/** @typedef {{ type: "code", props: { text: string } }} CodeTextSegment */
/** @typedef {(TextSegment | ImageSegment | LinkSegment | BoldTextSegment | ItalicTextSegment | CodeTextSegment)} InlineSegment */

/** @typedef {function(string): InlineContentSegmenterResult | undefined} InlineContentSegmenter */
/**
 * @typedef {Object} InlineContentSegmenterResult
 * @property {string} before
 * @property {InlineSegment} segment
 * @property {string} after
 */

/** @typedef {(HeadingBlock | HorizontalRuleBlock | BlockquoteBlock | ListItemBlock | UnorderedListBlock | OrderedListBlock | CodeBlock | InlineBlock | TableBlock | HTMLBlock | EmptyLineBlock)} Block */
/** @typedef {{ type: "heading", props: { level: number, heading: string} }} HeadingBlock */
/** @typedef {{ type: "horizontal_rule" }} HorizontalRuleBlock */
/** @typedef {{ type: "blockquote", contents: Block[] }} BlockquoteBlock */
/** @typedef {{ type: "list_item", contents: Block[] }} ListItemBlock */
/** @typedef {{ type: "unordered_list", contents: Block[] }} UnorderedListBlock */
/** @typedef {{ type: "ordered_list", contents: Block[] }} OrderedListBlock */
/** @typedef {{ type: "code_block", props: { language?: string, code: string } }} CodeBlock */
/** @typedef {{ type: "table", props: { header: TableCell[], align: ("left" | "center" | "right")[], rows: TableCell[][]} }} TableBlock*/
/** @typedef {{ type: "html", props: { html: string } }} HTMLBlock */
/** @typedef {{ type: "inline", props: { segments: InlineSegment[] } }} InlineBlock */
/** @typedef {{ type: "empty_line" }} EmptyLineBlock */
/** @typedef {{ segments: InlineSegment[] }} TableCell */

/**
 * @typedef {Object} BlockReader
 * @property {function(string[], number): boolean} match
 * @property {function(string[], number): BlockReaderResult} read
 */
/**
 * @typedef {Object} BlockReaderResult
 * @property {Block} block
 * @property {number} readLineCount
 */

export {};
