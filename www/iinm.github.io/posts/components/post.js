/** @import { Block as MarkdownBlock } from "../../lib/markdown"; */
/** @import { VirtualDomNode } from "../../lib/dom"; */

import {
  MarkdownContents,
  MarkdownContentToc,
} from "../../components/markdown.js";
import { h, t } from "../../lib/dom.js";

/**
 * @typedef {object} PageMetadata
 * @property {string} title
 * @property {string} description
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
    h("title", {}, t(metadata.title)),
    h("meta", { name: "description", content: metadata.description }),
    ...Object.entries(metadata.ogp).map(([property, content]) =>
      h("meta", {
        property,
        content,
      }),
    ),
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
  const toc = MarkdownContentToc({ markdownBlocks });
  const tocPosition = contents.findIndex((node) => node.tag === "h2");
  contents.splice(tocPosition, 0, toc);

  return [
    h(
      "div",
      { cls: "post__date" },
      h("date", { datetime: metadata.date }, t(metadata.date)),
    ),
    ...contents,
  ];
};
