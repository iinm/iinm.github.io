/**
 * @typedef {object} HighlightedCodeSegment
 * @property {string} text
 * @property {CodeHighlightType} [type]
 */

/** @typedef {"comment" | "keyword" | "string" | "heading"} CodeHighlightType */

/**
 * @param {string} code 
 * @param {string} [language] 
 * @returns {HighlightedCodeSegment[]}
 */
export const highlightCode = (code, language) => {
  const segmentHighlighters = language && highlighters[language];
  if (!segmentHighlighters) {
    return [{ text: code }];
  }
  return highlightSegment(code, segmentHighlighters);
}

/** @typedef {function(string): HighlighterResult} SegmentHighlighter */
/**
 * @typedef {object} HighlighterResult
 * @property {HighlightedCodeSegment} [segment]
 * @property {string} [before]
 * @property {string} [after]
 */

/**
 * @param {string} code
 * @param {SegmentHighlighter[]} segmentHighlighters
 */
const highlightSegment = (code, segmentHighlighters) => {
  if (!code) {
    return [];
  }
  for (const highlighter of segmentHighlighters) {
    const result = highlighter(code);
    const before = result.before ? highlightSegment(result.before, segmentHighlighters) : [];
    const after = result.after ? highlightSegment(result.after, segmentHighlighters) : [];
    if (result.segment) {
      return [...before, result.segment, ...after];
    }
  }
  return [{ text: code }];
}

/** @type {SegmentHighlighter} */
const genericDoubleQuoteStringHighlighter = (code) => {
  const match = code.match(/("[^\\]*?")/m);
  if (match) {
    const index = Number(match.index);
    return {
      segment: { text: match[0], type: "string" },
      before: code.slice(0, index),
      after: code.slice(index + match[0].length),
    };
  }
  return {};
}

/** @type {SegmentHighlighter} */
const genericSingleQuoteStringHighlighter = (code) => {
  const match = code.match(/('[^\\]*?')/m);
  if (match) {
    const index = Number(match.index);
    return {
      segment: { text: match[0], type: "string" },
      before: code.slice(0, index),
      after: code.slice(index + match[0].length),
    };
  }
  return {};
}

/** @type {SegmentHighlighter} */
const genericSharpPrefixedCommentHighlighter = (code) => {
  const match = code.match(/^(\s*)(#.*)$/m);
  if (match) {
    const index = Number(match.index);
    return {
      segment: { text: match[2], type: "comment" },
      before: code.slice(0, index + match[1].length),
      after: code.slice(index + match[0].length),
    };
  }
  return {};
}

/** @type {(any) => SegmentHighlighter} */
const keywordHighlighter = (pattern) => (code) => {
  const match = code.match(pattern)
  if (match) {
    const index = Number(match.index);
    return {
      segment: { text: match[0], type: "keyword" },
      before: code.slice(0, index),
      after: code.slice(index + match[0].length),
    }
  }
  return {};
}

/** @type {Object<string,SegmentHighlighter[]>} */
const highlighters = {
  javascript: [
    // comment
    (code) => {
      const match = code.match(/^(\s*)(\/\/.*)$/m);
      if (match) {
        const index = Number(match.index);
        return {
          segment: { text: match[2], type: "comment" },
          before: code.slice(0, index + match[1].length),
          after: code.slice(index + match[0].length),
        };
      }
      return {};
    },
    // string (`)
    (code) => {
      const match = code.match(/(`[^\\]*?`)/m);
      if (match) {
        const index = Number(match.index);
        return {
          segment: { text: match[0], type: "string" },
          before: code.slice(0, index),
          after: code.slice(index + match[0].length),
        };
      }
      return {};
    },
    genericDoubleQuoteStringHighlighter,
    genericSingleQuoteStringHighlighter,
    // keyword
    keywordHighlighter(/\b(return|const|let|for|while|break|continue|import|export)\b/m),
  ],
  markdown: [
    // heading
    (code) => {
      const match = code.match(/^(\s*)(#+)(.*)$/m);
      if (match) {
        const index = Number(match.index);
        return {
          segment: { text: match[0], type: "heading" },
          before: code.slice(0, index + match[1].length),
          after: code.slice(index + match[0].length),
        };
      }
      return {};
    }
  ],
  sh: [
    // comment
    genericSharpPrefixedCommentHighlighter,
    // string
    genericDoubleQuoteStringHighlighter,
    genericSingleQuoteStringHighlighter,
  ],
  python: [
    // comment
    genericSharpPrefixedCommentHighlighter,
    // string
    genericDoubleQuoteStringHighlighter,
    genericSingleQuoteStringHighlighter,
    // keyword
    keywordHighlighter(/\b(return|def|class|import|from)\b/m),
  ]
};
