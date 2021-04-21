export const parseBlocks = (markdownContentLines) => {
  const blocks = []
  for (let start = 0; start < markdownContentLines.length;) {
    const previousStart = start
    for (const reader of blockReaders) {
      if (reader.match(markdownContentLines, start)) {
        const { block, readLineCount } = reader.read(markdownContentLines, start)
        if (block.type !== 'empty_line') {
          blocks.push(block)
        }
        start += readLineCount
        break
      }
    }
    if (previousStart === start) {
      console.warn(`Cannot parse after "${lines[start]}", blocks: ${JSON.stringify(blocks, null, 2)}`)
      break
    }
  }
  return blocks
}

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
          contents: [match[2]],
          props: {
            level: match[1].length
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
  // unordered list
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
          itemStartSymbol = itemStartSymbol !== '' ? itemStartMatch[1] : itemStartSymbol
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
          contents: blocks.map(blockLines => parseBlocks(blockLines))
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
          contents: blockLines.join('\n'),
          props: {
            language: startMatch[1]
          }
        },
        readLineCount: cursor - start
      }
    }
  },
  // paragraph
  {
    match: (lines, start) => {
      return lines[start].match(/^ *.+$/) !== null
    },
    read: (lines, start) => {
      const match = lines[start].match(/^ *(.+)$/)
      return {
        block: {
          type: 'paragragh',
          contents: [match[1]]
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
