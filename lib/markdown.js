/** @typedef {import("./markdown.type").Block} Block */
/** @typedef {import("./markdown.type").InlineSegment} InlineSegment */
/** @typedef {import("./markdown.type").InlineBlock} InlineBlock */
/** @typedef {import("./markdown.type").BlockReader} BlockReader */
/** @typedef {import("./markdown.type").InlineContentSegmenter} InlineContentSegmenter */

/**
 * @param {string} content
 * @returns {Block[]}
 */
export const parse = (content) => {
  const lines = content.split("\n");
  return mergeInlineBlocks(parseBlocks(lines));
};

/**
 * @param {Block[]} blocks
 * @returns {Block[]}
 */
const mergeInlineBlocks = (blocks) => {
  const merged = [];
  for (const block of blocks) {
    if (
      merged.length > 0 &&
      merged[merged.length - 1].type === "inline" &&
      block.type === "inline"
    ) {
      const previousBlock = /** @type {InlineBlock} */ (
        merged[merged.length - 1]
      );
      const mergedSegments = previousBlock.props.segments.concat(
        [{ type: "text", props: { text: " " } }],
        block.props.segments
      );
      previousBlock.props.segments = mergedSegments;
    } else {
      merged.push(block);
    }
  }
  return merged;
};

/**
 * @param {string[]} markdownContentLines
 * @returns {Block[]}
 */
const parseBlocks = (markdownContentLines) => {
  const blocks = [];
  for (let start = 0; start < markdownContentLines.length; ) {
    const previousStart = start;
    for (const reader of blockReaders) {
      if (reader.match(markdownContentLines, start)) {
        const { block, readLineCount } = reader.read(
          markdownContentLines,
          start
        );
        blocks.push(block);
        start += readLineCount;
        break;
      }
    }
    if (previousStart === start) {
      console.warn(
        "Cannot parse after:",
        markdownContentLines[start],
        "blocks:",
        blocks
      );
      break;
    }
  }
  return blocks;
};

/** @type {BlockReader[]} */
const blockReaders = [
  // heading
  {
    match: (lines, start) => {
      return lines[start].match(/^#+ +.+$/) !== null;
    },
    read: (lines, start) => {
      const match = lines[start].match(/^(#+) +(.+)$/);
      if (match?.length !== 3) {
        throw new Error(`Failed to read line, "${lines[start]}" as heading`);
      }
      return {
        block: {
          type: "heading",
          props: {
            level: match[1].length,
            heading: match[2],
          },
        },
        readLineCount: 1,
      };
    },
  },
  // horizontal ruler
  {
    match: (lines, start) => {
      return (
        lines[start] === "" &&
        lines.length > start + 1 &&
        lines[start + 1].match(/^-{3,}$/) !== null
      );
    },
    read: () => {
      return {
        block: {
          type: "horizontal_rule",
        },
        readLineCount: 2,
      };
    },
  },
  // blockquote
  {
    match: (lines, start) => {
      return lines[start].match(/^ *> *.+$/) !== null;
    },
    read: (lines, start) => {
      const blockLines = [];
      const pattern = /^ *> *(.*)$/;
      let cursor = start;
      for (; cursor < lines.length; cursor++) {
        const match = lines[cursor].match(pattern);
        if (match?.length !== 2) {
          break;
        }
        blockLines.push(match[1]);
      }
      return {
        block: {
          type: "blockquote",
          contents: parseBlocks(blockLines),
        },
        readLineCount: cursor - start,
      };
    },
  },
  // list
  {
    match: (lines, start) => {
      return lines[start].match(/^(?:[-+*]|\d+\.) +.+$/) !== null;
    },
    read: (lines, start) => {
      const blocks = [];
      let itemLines = [];
      let itemStartSymbol = "";
      let indent = 0;
      const itemStartPattern = /^([-+*]|\d+\.) +(.+)$/;
      const contentPattern = /^( +).+$/;
      let cursor = start;
      for (; cursor < lines.length; cursor++) {
        const itemStartMatch = lines[cursor].match(itemStartPattern);
        if (itemStartMatch?.length === 3) {
          itemStartSymbol =
            itemStartSymbol === "" ? itemStartMatch[1] : itemStartSymbol;
          if (itemLines.length > 0) {
            blocks.push(itemLines);
          }
          itemLines = [itemStartMatch[2]];
          continue;
        }
        const contentMatch = lines[cursor].match(contentPattern);
        if (contentMatch?.length === 2) {
          indent = indent > 0 ? indent : contentMatch[1].length;
          itemLines.push(contentMatch[0].substring(indent));
          continue;
        }
        break;
      }
      if (itemLines.length > 0) {
        blocks.push(itemLines);
      }
      return {
        block: {
          type: itemStartSymbol.match(/^[-+*]/)
            ? "unordered_list"
            : "ordered_list",
          contents: blocks.map((blockLines) => ({
            type: "list_item",
            contents: parseBlocks(blockLines),
          })),
        },
        readLineCount: cursor - start,
      };
    },
  },
  // code block
  {
    match: (lines, start) => {
      return lines[start].match("^```.*$") !== null;
    },
    read: (lines, start) => {
      const blockLines = [];
      const startPattern = "^```(.*)$";
      const endPattern = "^```$";
      const startMatch = lines[start].match(startPattern);
      let cursor = start + 1;
      for (; cursor < lines.length; cursor++) {
        const endMatch = lines[cursor].match(endPattern);
        if (endMatch !== null) {
          cursor++;
          break;
        }
        blockLines.push(lines[cursor]);
      }
      return {
        block: {
          type: "code_block",
          props: {
            language: startMatch?.[1],
            code: blockLines.join("\n"),
          },
        },
        readLineCount: cursor - start,
      };
    },
  },
  // table
  {
    match: (lines, start) => lines[start].match(/^\|.+\|$/) !== null,
    read: (lines, start) => {
      // read header
      const parts = lines[start].split("|"); // e.g., [ '', 'one', 'two', '' ]
      const header = parts
        .slice(1, parts.length - 1)
        .map((col) => ({ segments: parseInline(col.trim()) }));
      // read align
      const alignParts = lines[start + 1]
        ?.split("|")
        ?.slice(1, 1 + header.length);
      if (alignParts?.length !== header.length) {
        throw new Error(
          `Failed to read lines, ${lines.slice(start, start + 1)} as table`
        );
      }
      const align = alignParts.map((col) => {
        const trimmed = col.trim();
        if (trimmed.startsWith(":-") && trimmed.endsWith("-:")) {
          return "center";
        }
        if (trimmed.endsWith("-:")) {
          return "right";
        }
        return "left";
      });
      // row
      const rows = [];
      let cursor = start + 2;
      for (; cursor < lines.length; cursor++) {
        if (lines[cursor].match(/^\|.+\|$/) === null) {
          break;
        }
        const parts = lines[cursor].split("|");
        const row = parts
          .slice(1, 1 + header.length)
          .map((col) => ({ segments: parseInline(col.trim()) }));
        if (row?.length !== header.length) {
          throw new Error(`Failed to read lines, ${lines[cursor]} as table`);
        }
        rows.push(row);
      }
      return {
        block: {
          type: "table",
          props: {
            header,
            align,
            rows,
          },
        },
        readLineCount: cursor - start,
      };
    },
  },
  // html
  {
    match: (lines, start) => lines[start].match(/^<\w+/) !== null,
    read: (lines, start) => {
      const startMatch = lines[start].match(/^<(\w+)/);
      if (startMatch?.length !== 2) {
        throw new Error(`Failed to read line, ${lines[start]} as html`);
      }
      const tag = startMatch[1];

      const endPattern = `^</ *${tag}>$`;
      let cursor = start;
      for (; cursor < lines.length; cursor++) {
        if (lines[cursor].match(endPattern)) {
          cursor++;
          break;
        }
      }
      return {
        block: {
          type: "html",
          props: {
            html: lines.slice(start, cursor + 1).join("\n"),
          },
        },
        readLineCount: cursor - start,
      };
    },
  },
  // inline
  {
    match: (lines, start) => {
      return lines[start].match(/^ *.+$/) !== null;
    },
    read: (lines, start) => {
      const match = lines[start].match(/^ *(.+)$/);
      if (match?.length !== 2) {
        throw new Error(`Failed to read line, "${lines[start]}" as inline`);
      }
      return {
        block: {
          type: "inline",
          props: {
            segments: parseInline(match[1]),
          },
        },
        readLineCount: 1,
      };
    },
  },
  // empty_line
  {
    match: (lines, start) => {
      return lines[start] === "";
    },
    read: () => {
      return {
        block: {
          type: "empty_line",
        },
        readLineCount: 1,
      };
    },
  },
];

/**
 * @param {string} inlineContent
 * @returns {InlineSegment[]}
 */
const parseInline = (inlineContent) => {
  if (!inlineContent) return [];
  for (const segmenter of inlineContentSegmenters) {
    const segments = segmenter(inlineContent);
    if (segments) {
      const { before, segment, after } = segments;
      return [...parseInline(before), segment, ...parseInline(after)];
    }
  }
  return [{ type: "text", props: { text: inlineContent } }];
};

/** @type {InlineContentSegmenter[]} */
const inlineContentSegmenters = [
  // image
  (inlineContent) => {
    const match = inlineContent.match(
      "(.*)!\\[([^\\]]*)\\]\\(([^\\)]+)\\)(.*)"
    );
    if (match === null) return;
    return {
      before: match[1],
      segment: {
        type: "image",
        props: {
          alt: match[2],
          src: match[3],
        },
      },
      after: match[4],
    };
  },
  // link
  (inlineContent) => {
    const match = inlineContent.match("(.*)\\[([^\\]]+)\\]\\(([^\\)]+)\\)(.*)");
    if (match?.length !== 5) return;
    return {
      before: match[1],
      segment: {
        type: "link",
        props: {
          text: match[2],
          url: match[3],
        },
      },
      after: match[4],
    };
  },
  // bold
  (inlineContent) => {
    const match = inlineContent.match(/(.*)\*\*([^*]+)\*\*(.*)/);
    if (match === null) return;
    return {
      before: match[1],
      segment: {
        type: "bold",
        props: {
          text: match[2],
        },
      },
      after: match[3],
    };
  },
  // italic
  (inlineContent) => {
    const match = inlineContent.match(/(.*)\*([^*]+)\*(.*)/);
    if (match === null) return;
    return {
      before: match[1],
      segment: {
        type: "italic",
        props: {
          text: match[2],
        },
      },
      after: match[3],
    };
  },
  // code
  (inlineContent) => {
    const match = inlineContent.match("(.*)`([^`]+)`(.*)");
    if (match === null) return;
    return {
      before: match[1],
      segment: {
        type: "code",
        props: {
          text: match[2],
        },
      },
      after: match[3],
    };
  },
];
