/** @typedef {import("../../lib/markdown.type").Block} MarkdownBlock */
/** @typedef {import("../../lib/markdown.type").HeadingBlock} HeadingBlock */
/** @typedef {import("../../lib/markdown.type").InlineSegment} InlineSegment */
/** @typedef {import("../../lib/dom.type").VirtualDomNode} VirtualDomNode */

import * as hash from "../../lib/hash.js";

/**
 * @typedef {object} PageMetadata
 * @property {string} title
 * @property {string} date
 * @property {Object<string, string>} ogp
 */

/**
 * @typedef {object} MetaContentsProps
 * @property {PageMetadata} metadata
 */

/**
 * @param {MetaContentsProps} props
 * @returns {VirtualDomNode[]}
 */
export const MetaContents = ({ metadata }) => {
  return [
    {
      tag: "title",
      children: [{ tag: "*text", text: metadata.title }],
    },
    ...Object.entries(metadata.ogp).map(([property, content]) => ({
      tag: "meta",
      attr: {
        property,
        content,
      },
    })),
  ];
};

/**
 * @typedef {object} PostProps
 * @property {MarkdownBlock[]} markdownBlocks
 * @property {PageMetadata} metadata
 */

/**
 * @param {PostProps} props
 * @returns {VirtualDomNode[]}
 */
export const Post = ({ markdownBlocks, metadata }) => {
  const contents = MarkdownContents({ blocks: markdownBlocks });
  const toc = Toc({ markdownBlocks });
  const tocPosition = contents.findIndex((node) => node.tag === "h2");
  contents.splice(tocPosition, 0, toc);

  return [
    {
      tag: "div",
      className: "post__date",
      children: [
        {
          tag: "data",
          attr: { datatime: metadata.date },
          children: [{ tag: "*text", text: metadata.date }],
        },
      ],
    },
    ...contents,
  ];
};

/** @typedef {{ markdownBlocks: MarkdownBlock[] }} TocProps */

/**
 *
 * @param {TocProps} param0
 * @returns {VirtualDomNode}
 */
const Toc = ({ markdownBlocks }) => {
  return {
    tag: "section",
    className: "collapsible",
    children: [
      {
        tag: "input",
        className: "collapsible__toggle",
        attr: {
          id: "toc-toggle",
          type: "checkbox",
          checked: "",
        },
      },
      {
        tag: "label",
        className: "collapsible__label",
        attr: {
          for: "toc-toggle",
        },
        children: [{ tag: "*text", text: "Table of Contents" }],
      },
      {
        tag: "ul",
        className: "collapsible__content",
        children: markdownBlocks
          .filter(
            (block) => block.type === "heading" && block.props.level === 2
          )
          .map((block) => {
            const headingBlock = /** @type {HeadingBlock} */ (block);
            return {
              tag: "li",
              children: [
                {
                  tag: "a",
                  attr: {
                    href: `#${hash.cyrb53(headingBlock.props.heading)}`,
                  },
                  children: [
                    { tag: "*text", text: headingBlock.props.heading },
                  ],
                },
              ],
            };
          }),
      },
    ],
  };
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
const MarkdownContents = ({ blocks, parentTag }) => {
  /** @type {VirtualDomNode[]} */
  const nodes = [];
  for (const block of blocks) {
    switch (block.type) {
      case "heading": {
        nodes.push({
          tag: `h${block.props.level}`,
          attr: {
            id: String(hash.cyrb53(block.props.heading)),
          },
          children: [
            {
              tag: "*text",
              text: block.props.heading,
            },
          ],
        });
        break;
      }
      case "horizontal_rule": {
        nodes.push({
          tag: "hr",
        });
        break;
      }
      case "blockquote": {
        nodes.push({
          tag: "blockquote",
          children: MarkdownContents({ blocks: block.contents }),
        });
        break;
      }
      case "unordered_list": {
        nodes.push({
          tag: "ul",
          children: MarkdownContents({
            blocks: block.contents,
            parentTag: "ul",
          }),
        });
        break;
      }
      case "ordered_list": {
        nodes.push({
          tag: "ol",
          children: MarkdownContents({
            blocks: block.contents,
            parentTag: "ol",
          }),
        });
        break;
      }
      case "list_item": {
        nodes.push({
          tag: "li",
          children: MarkdownContents({
            blocks: block.contents,
            parentTag: "li",
          }),
        });
        break;
      }
      case "code_block": {
        // language label
        if (block.props.language) {
          nodes.push({
            tag: "div",
            className: "code-block__language-label",
            children: [
              {
                tag: "*text",
                text: block.props.language,
              },
            ],
          });
        }
        // pre, code
        nodes.push({
          tag: "pre",
          children: [
            {
              tag: "code",
              children: [
                {
                  tag: "*text",
                  text: block.props.code,
                },
              ],
            },
          ],
        });
        break;
      }
      case "table": {
        nodes.push({
          tag: "table",
          children: /** @type {VirtualDomNode[]} */ (
            [
              // header
              {
                tag: "tr",
                children: block.props.header.map(({ segments }) => ({
                  tag: "th",
                  children: segments.map(MarkdownSegment).filter((s) => s),
                })),
              },
              ...block.props.rows.map((row) => ({
                tag: "tr",
                children: new Array(row.length).fill(0).map((_, index) => ({
                  tag: "td",
                  style: { textAlign: block.props.align[index] },
                  children: row[index].segments
                    .map(MarkdownSegment)
                    .filter((s) => s),
                })),
              })),
            ].filter((s) => s)
          ),
        });
        break;
      }
      case "html":
        nodes.push({
          tag: "*html",
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
          nodes.push({
            tag: "p",
            children: /** @type {VirtualDomNode[]} */ (
              block.props.segments.map(MarkdownSegment).filter((s) => s)
            ),
          });
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
      return {
        tag: "a",
        attr: {
          href: segment.props.url,
        },
        children: [
          {
            tag: "*text",
            text: segment.props.text,
          },
        ],
      };
    }
    case "image": {
      return {
        tag: "div",
        className: "image-link",
        children: [
          {
            tag: "a",
            attr: {
              href: segment.props.src,
              target: "_blank",
              rel: "noopener",
            },
            children: [
              {
                tag: "img",
                attr: {
                  src: segment.props.src,
                  alt: segment.props.alt || "",
                  loading: "lazy",
                },
              },
            ],
          },
        ],
      };
    }
    case "bold": {
      return {
        tag: "b",
        children: [
          {
            tag: "*text",
            text: segment.props.text,
          },
        ],
      };
    }
    case "italic": {
      return {
        tag: "em",
        children: [
          {
            tag: "*text",
            text: segment.props.text,
          },
        ],
      };
    }
    case "code": {
      return {
        tag: "code",
        children: [
          {
            tag: "*text",
            text: segment.props.text,
          },
        ],
      };
    }
    case "text": {
      return {
        tag: "*text",
        text: segment.props.text,
      };
    }
    default:
      console.warn("Cannot render segment:", segment);
  }
};
