interface InlineSegmentBase<
  Type = 'base',
  Props = Record<string, unknown>
  > {
  type: Type
  props: Props
}

export type TextSegment = InlineSegmentBase<'text', { text: string; }>
export type ImageSegment = InlineSegmentBase<'image', { alt?: string; src: string; }>
export type LinkSegment = InlineSegmentBase<'link', { url: string; text: string; }>
export type BoldTextSegment = InlineSegmentBase<'bold', { text: string; }>
export type ItalicTextSegment = InlineSegmentBase<'italic', { text: string; }>
export type CodeSegment = InlineSegmentBase<'code', { text: string; }>

export type InlineSegment =
  | TextSegment
  | ImageSegment
  | LinkSegment
  | BoldTextSegment
  | ItalicTextSegment
  | CodeSegment

interface HeadingBlock {
  type: 'heading'
  props: {
    level: number
    heading: string
  }
}

interface HorizontalRuleBlock {
  type: 'horizontal_rule'
}

interface BlockquoteBlock<T> {
  type: 'blockquote'
  contents: T[]
}

interface ListItemBlock<T> {
  type: 'list_item'
  contents: T[]
}

interface UnorderedListBlock<T> {
  type: 'unordered_list'
  contents: T[]
}

interface OrderedListBlock<T> {
  type: 'ordered_list'
  contents: T[]
}

interface CodeBlock {
  type: 'code_block'
  props: {
    language?: string
    code: string
  }
}

interface HTMLBlock {
  type: 'html'
  props: {
    html: string
  }
}

export interface InlineBlock {
  type: 'inline'
  props: {
    segments: InlineSegment[]
  }
}

interface EmptyLineBlock {
  type: 'empty_line'
}

export type Block =
  | HeadingBlock
  | HorizontalRuleBlock
  | BlockquoteBlock<Block>
  | ListItemBlock<Block>
  | UnorderedListBlock<ListItemBlock<Block>>
  | OrderedListBlock<ListItemBlock<Block>>
  | CodeBlock
  | InlineBlock
  | HTMLBlock
  | EmptyLineBlock

interface BlockReader {
  match: (lines: string[], start: number) => boolean
  read: (lines: string[], start: number) => { block: Block, readLineCount: number }
}

export const parseBlocks = (markdownContentLines: string[]): Block[] => {
  const blocks: Block[] = []
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
      console.warn('Cannot parse after:', markdownContentLines[start], 'blocks:', blocks)
      break
    }
  }
  return blocks
}

const blockReaders: BlockReader[] = [
  // heading
  {
    match: (lines, start) => {
      return lines[start].match(/^#+ +.+$/) !== null
    },
    read: (lines: string[], start: number) => {
      const match = lines[start].match(/^(#+) +(.+)$/)
      if (match?.length !== 3) {
        throw new Error(`Failed to read line, "${lines[start]}" as heading`)
      }
      return {
        block: {
          type: 'heading',
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
      return lines[start] === '' &&
        lines.length > start + 1 && lines[start + 1].match(/^-{3,}$/) !== null
    },
    read: () => {
      return {
        block: {
          type: 'horizontal_rule'
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
        if (match?.length !== 2) {
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
      return lines[start].match(/^(?:[-+*]|\d+\.) +.+$/) !== null
    },
    read: (lines, start) => {
      const blocks: string[][] = []
      let itemLines: string[] = []
      let itemStartSymbol = ''
      let indent = 0
      const itemStartPattern = /^([-+*]|\d+\.) +(.+)$/
      const contentPattern = /^( +).+$/
      let cursor = start
      for (; cursor < lines.length; cursor++) {
        const itemStartMatch = lines[cursor].match(itemStartPattern)
        if (itemStartMatch?.length === 3) {
          itemStartSymbol = itemStartSymbol === '' ? itemStartMatch[1] : itemStartSymbol
          if (itemLines.length > 0) {
            blocks.push(itemLines)
          }
          itemLines = [itemStartMatch[2]]
          continue
        }
        const contentMatch = lines[cursor].match(contentPattern)
        if (contentMatch?.length === 2) {
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
        block: <Block>{
          type: itemStartSymbol.match(/^[-+*]/) ? 'unordered_list' : 'ordered_list',
          contents: blocks.map(blockLines => ({
            type: 'list_item',
            contents: parseBlocks(blockLines)
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
      const blockLines: string[] = []
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
          props: {
            language: startMatch?.[1],
            code: blockLines.join('\n')
          }
        },
        readLineCount: cursor - start
      }
    }
  },
  {
    match: (lines, start) => lines[start].match(/^<\w+/) !== null,
    read: (lines, start) => {
      const startMatch = lines[start].match(/^<(\w+)/)
      if (startMatch?.length !== 2) {
        throw new Error(`Failed to read line, ${lines[start]} as html`)
      }
      const tag = startMatch[1]

      const endPattern = `^</ *${tag}>$`
      let cursor = start
      for (; cursor < lines.length; cursor++) {
        if (lines[cursor].match(endPattern)) {
          break
        }
      }
      return {
        block: {
          type: 'html',
          props: {
            html: lines.slice(start, cursor + 1).join('\n')
          }
        },
        readLineCount: cursor - start + 1
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
      if (match?.length !== 2) {
        throw new Error(`Failed to read line, "${lines[start]}" as inline`)
      }
      return {
        block: {
          type: 'inline',
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
    read: () => {
      return {
        block: {
          type: 'empty_line'
        },
        readLineCount: 1
      }
    }
  }
]

const parseInline = (inlineContent: string): InlineSegment[] => {
  if (!inlineContent) return []
  for (const segmenter of inlineContentSegmenters) {
    const segments = segmenter(inlineContent)
    if (segments) {
      const { before, segment, after } = segments
      return [...parseInline(before), segment, ...parseInline(after)]
    }
  }
  return [{ type: 'text', props: { text: inlineContent } }]
}

type InlineContentSegmenter = (inlineContent: string) => {
  before: string
  segment: InlineSegment
  after: string
} | undefined

const inlineContentSegmenters: InlineContentSegmenter[] = [
  // image
  (inlineContent) => {
    const match = inlineContent.match('(.*)!\\[([^\\]]*)\\]\\(([^\\)]+)\\)(.*)')
    if (match === null) return
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
    if (match?.length !== 5) return
    return {
      before: match[1],
      segment: {
        type: 'link',
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
    if (match === null) return
    return {
      before: match[1],
      segment: {
        type: 'bold',
        props: {
          text: match[2]
        }
      },
      after: match[3]
    }
  },
  // italic
  (inlineContent) => {
    const match = inlineContent.match(/(.*)\*([^*]+)\*(.*)/)
    if (match === null) return
    return {
      before: match[1],
      segment: {
        type: 'italic',
        props: {
          text: match[2]
        }
      },
      after: match[3]
    }
  },
  // code
  (inlineContent) => {
    const match = inlineContent.match('(.*)`([^`]+)`(.*)')
    if (match === null) return
    return {
      before: match[1],
      segment: {
        type: 'code',
        props: {
          text: match[2]
        }
      },
      after: match[3]
    }
  }
]
