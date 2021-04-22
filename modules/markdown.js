export const parseBlocks = (markdownContentLines) => {
  const blocks = []
  for (let start = 0; start < markdownContentLines.length;) {
    const previousStart = start
    for (const reader of blockReaders) {
      if (reader.match(markdownContentLines, start)) {
        const { block, readLineCount } = reader.read(markdownContentLines, start)
        blocks.push(block)
        start += readLineCount
        break
      }
    }
    if (previousStart === start) {
      console.warn("Cannot parse after:", markdownContentLines[start], "blocks:", blocks)
      break
    }
  }
  return blocks
}

const parseInline = (inlineContent) => {
  if (inlineContent === '') return []
  for (const segmenter of inlineContentSegmenters) {
    const { before, segment, after } = segmenter(inlineContent)
    if (segment) {
      return [...parseInline(before), segment, ...parseInline(after)]
    }
  }
  return [{ type: 'text', props: { text: inlineContent } }]
}

const inlineContentSegmenters = [
  // image
  (inlineContent) => {
    const match = inlineContent.match('(.*)!\\[([^\\]]*)\\]\\(([^\\)]+)\\)(.*)')
    if (match === null) return {}
    return {
      before: match[1],
      segment: {
        type: 'image',
        props: {
          alt: match[2],
          src: match[3]
        }
      },
      after: match[4]
    }
  },
  // link
  (inlineContent) => {
    const match = inlineContent.match('(.*)\\[([^\\]]+)\\]\\(([^\\)]+)\\)(.*)')
    if (match === null) return {}
    return {
      before: match[1],
      segment: {
        type: 'url',
        props: {
          text: match[2],
          url: match[3]
        }
      },
      after: match[4]
    }

  },
  // bold
  (inlineContent) => {
    const match = inlineContent.match(/(.*)\*\*([^*]+)\*\*(.*)/)
    if (match === null) return {}
    return {
      before: match[1],
      segment: {
        type: 'bold',
        props: {
          text: match[2],
        }
      },
      after: match[3]
    }
  },
  // italic
  (inlineContent) => {
    const match = inlineContent.match(/(.*)\*([^*]+)\*(.*)/)
    if (match === null) return {}
    return {
      before: match[1],
      segment: {
        type: 'italic',
        props: {
          text: match[2],
        }
      },
      after: match[3]
    }
  }

]

const blockReaders = [
  // heading
  {
    match: (lines, start) => {
      return lines[start].match(/^#+ +.+$/) !== null
    },
    read: (lines, start) => {
      const match = lines[start].match(/^(#+) +(.+)$/)
      return {
        block: {
          type: 'heading',
          contents: [],
          props: {
            level: match[1].length,
            heading: match[2]
          }
        },
        readLineCount: 1
      }
    }
  },
  // horizontal ruler
  {
    match: (lines, start) => {
      return lines[start] === ''
        && lines.length > start + 1 && lines[start+1].match(/^-{3,}$/) !== null
    },
    read: (_0, _1) => {
      return {
        block: {
          type: 'horizontal_rule',
          contents: []
        },
        readLineCount: 2
      }
    }
  },
  // blockquote
  {
    match: (lines, start) => {
      return lines[start].match(/^ *> *.+$/) !== null
    },
    read: (lines, start) => {
      const blockLines = []
      const pattern = /^ *> *(.*)$/
      let cursor = start
      for (; cursor < lines.length; cursor++) {
        const match = lines[cursor].match(pattern)
        if (match === null) {
          break
        }
        blockLines.push(match[1])
      }
      return {
        block: {
          type: 'blockquote',
          contents: parseBlocks(blockLines)
        },
        readLineCount: cursor - start
      }
    }
  },
  // list
  {
    match: (lines, start) => {
      return lines[start].match(/^(?:[\-+*]|\d+\.) +.+$/) !== null
    },
    read: (lines, start) => {
      const blocks = []
      let itemLines = []
      let itemStartSymbol = ''
      let indent = 0
      const itemStartPattern = /^([\-+*]|\d+\.) +(.+)$/
      const contentPattern = /^( +).+$/
      let cursor = start
      for (; cursor < lines.length; cursor++) {
        const itemStartMatch = lines[cursor].match(itemStartPattern)
        if (itemStartMatch !== null) {
          itemStartSymbol = itemStartSymbol === '' ? itemStartMatch[1] : itemStartSymbol
          if (itemLines.length > 0) {
            blocks.push(itemLines)
          }
          itemLines = [itemStartMatch[2]]
          continue
        }
        const contentMatch = lines[cursor].match(contentPattern)
        if (contentMatch !== null) {
          indent = indent > 0 ? indent : contentMatch[1].length
          itemLines.push(contentMatch[0].substring(indent))
          continue
        }
        break
      }
      if (itemLines.length > 0) {
        blocks.push(itemLines)
      }
      return {
        block: {
          type: itemStartSymbol.match(/^[\-+*]/) ? 'unordered_list' : 'ordered_list',
          contents: blocks.map(blockLines => ({
            type: 'list_item',
            contents: parseBlocks(blockLines),
            props: {}
          }))
        },
        readLineCount: cursor - start
      }
    }
  },
  // code block
  {
    match: (lines, start) => {
      return lines[start].match('^```.*$') !== null
    },
    read: (lines, start) => {
      const blockLines = []
      const startPattern = '^```(.*)$'
      const endPattern = '^```$'
      const startMatch = lines[start].match(startPattern)
      let cursor = start + 1
      for (; cursor < lines.length; cursor++) {
        const endMatch = lines[cursor].match(endPattern)
        if (endMatch !== null) {
          cursor++
          break
        }
        blockLines.push(lines[cursor])
      }
      return {
        block: {
          type: 'code_block',
          contents: [],
          props: {
            language: startMatch[1],
            code: blockLines.join('\n')
          }
        },
        readLineCount: cursor - start
      }
    }
  },
  // inline
  {
    match: (lines, start) => {
      return lines[start].match(/^ *.+$/) !== null
    },
    read: (lines, start) => {
      const match = lines[start].match(/^ *(.+)$/)
      return {
        block: {
          type: 'inline',
          contents: [],
          props: {
            segments: parseInline(match[1])
          }
        },
        readLineCount: 1
      }
    }
  },
  // empty_line
  {
    match: (lines, start) => {
      return lines[start] === ''
    },
    read: (_0, _1) => {
      return {
        block: {
          type: 'empty_line',
          contents: []
        },
        readLineCount: 1
      }
    }
  }
]
