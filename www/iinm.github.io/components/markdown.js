/** @typedef {import("../lib/markdown.type").Block} MarkdownBlock */
/** @typedef {import("../lib/markdown.type").HeadingBlock} HeadingBlock */
/** @typedef {import("../lib/markdown.type").InlineSegment} InlineSegment */
/** @typedef {import("../lib/dom.type").VirtualDomNode} VirtualDomNode */

import { h, t } from "../lib/dom.js";
import { cyrb53 } from "../lib/hash.js";
import { highlightCode } from "../lib/code-highlight.js";

/** @typedef {{ markdownBlocks: MarkdownBlock[] }} TocProps */

/**
 *
 * @param {TocProps} param0
 * @returns {VirtualDomNode}
 */
export const MarkdownContentToc = ({ markdownBlocks }) => {
  return h(
    "section",
    { cls: "collapsible" },
    h("input", {
      cls: "collapsible__toggle",
      id: "toc-toggle",
      type: "checkbox",
      checked: "",
    }),
    h(
      "label",
      {
        cls: "collapsible__label",
        for: "toc-toggle",
      },
      t("Table of Contents"),
    ),
    h(
      "ul",
      {
        cls: "collapsible__content",
      },
      ...markdownBlocks
        .filter((block) => block.type === "heading" && block.props.level === 2)
        .map((block) => {
          const headingBlock = /** @type {HeadingBlock} */ (block);
          return h(
            "li",
            {},
            h(
              "a",
              {
                href: `#${cyrb53(headingBlock.props.heading)}`,
              },
              t(headingBlock.props.heading),
            ),
          );
        }),
    ),
  );
};

/**
 * @typedef {object} MarkdownContentsProps
 * @property {MarkdownBlock[]} blocks
 * @property {string} [parentTag]
 */

/**
 * @param {MarkdownContentsProps} props
 * @returns {VirtualDomNode[]}
 */
export const MarkdownContents = ({ blocks, parentTag }) => {
  /** @type {VirtualDomNode[]} */
  const nodes = [];
  for (const block of blocks) {
    switch (block.type) {
      case "heading": {
        nodes.push(
          h(
            `h${block.props.level}`,
            { id: String(cyrb53(block.props.heading)) },
            t(block.props.heading),
          ),
        );
        break;
      }
      case "horizontal_rule": {
        nodes.push(h("hr", {}));
        break;
      }
      case "blockquote": {
        nodes.push(
          h("blockquote", {}, ...MarkdownContents({ blocks: block.contents })),
        );
        break;
      }
      case "unordered_list": {
        nodes.push(
          h(
            "ul",
            {},
            ...MarkdownContents({
              blocks: block.contents,
              parentTag: "ul",
            }),
          ),
        );
        break;
      }
      case "ordered_list": {
        nodes.push(
          h(
            "ol",
            {},
            ...MarkdownContents({
              blocks: block.contents,
              parentTag: "ol",
            }),
          ),
        );
        break;
      }
      case "list_item": {
        nodes.push(
          h(
            "li",
            {},
            ...MarkdownContents({
              blocks: block.contents,
              parentTag: "li",
            }),
          ),
        );
        break;
      }
      case "code_block": {
        if (block.props.language === "mermaid") {
          nodes.push(h("pre", { cls: "mermaid" }, t(block.props.code)));
          break;
        }

        // language label
        if (block.props.language) {
          nodes.push(
            h(
              "div",
              { cls: "code-block__language-label" },
              t(block.props.language),
            ),
          );
        }
        // pre, code
        nodes.push(
          h(
            "pre",
            {},
            h(
              "code",
              {},
              ...HighlightedCodeSegments({
                code: block.props.code,
                language: block.props.language,
              }),
            ),
          ),
        );
        break;
      }
      case "table": {
        nodes.push(
          h(
            "table",
            {},
            // header
            h(
              "tr",
              {},
              ...block.props.header.map(({ segments }) =>
                h(
                  "th",
                  {},
                  // @ts-ignore
                  ...segments.map(MarkdownSegment).filter((s) => s),
                ),
              ),
            ),
            ...block.props.rows.map((row) =>
              h(
                "tr",
                {},
                ...new Array(row.length).fill(0).map((_, index) =>
                  h(
                    "td",
                    { style: { textAlign: block.props.align[index] } },
                    // @ts-ignore
                    ...row[index].segments
                      .map(MarkdownSegment)
                      .filter((s) => s),
                  ),
                ),
              ),
            ),
          ),
        );
        break;
      }
      case "html":
        nodes.push({
          tag: "html*",
          html: block.props.html,
        });
        break;
      case "inline": {
        if (parentTag && ["li"].includes(parentTag)) {
          for (const segment of block.props.segments) {
            const node = MarkdownSegment(segment);
            if (node) {
              nodes.push(node);
            }
          }
        } else {
          nodes.push(
            h(
              "p",
              {},
              // @ts-ignore
              ...block.props.segments.map(MarkdownSegment).filter((s) => s),
            ),
          );
        }
        break;
      }
      case "empty_line":
        break;
      default:
        console.warn("Cannot render block:", block);
    }
  }
  return nodes;
};

/**
 * @param {InlineSegment} segment
 * @returns {VirtualDomNode | undefined}
 */
const MarkdownSegment = (segment) => {
  switch (segment.type) {
    case "link": {
      return h(
        "a",
        {
          href: segment.props.url,
        },
        t(segment.props.text),
      );
    }
    case "image": {
      return h(
        "div",
        { cls: "image-link" },
        h(
          "a",
          {
            href: segment.props.src,
            target: "_blank",
            rel: "noopener",
          },
          h("img", {
            src: segment.props.src,
            alt: segment.props.alt || "",
            loading: "lazy",
          }),
        ),
      );
    }
    case "bold": {
      return h("b", {}, t(segment.props.text));
    }
    case "italic": {
      return h("em", {}, t(segment.props.text));
    }
    case "code": {
      return h("code", {}, t(segment.props.text));
    }
    case "text": {
      return t(segment.props.text);
    }
    default:
      console.warn("Cannot render segment:", segment);
  }
};

/**
 * @typedef {object} HighlightedCodeSegmentsProps
 * @property {string} code
 * @property {string} [language]
 */

/**
 * @param {HighlightedCodeSegmentsProps} props
 * @returns {VirtualDomNode[]}
 */
const HighlightedCodeSegments = ({ code, language }) => {
  const segments = highlightCode(code, language);
  return segments.map((segment) => {
    if (segment.type) {
      return h(
        "span",
        {
          cls: `code--${segment.type}`,
        },
        t(segment.text),
      );
    }
    return t(segment.text);
  });
};
