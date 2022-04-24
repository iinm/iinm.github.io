import { JSDOM } from 'jsdom'
import { cyrb53 } from './cyrb53'
import { Block, InlineBlock, InlineSegment, parseBlocks } from './markdown'

type OGPMetadata = Record<string, string>

interface Metadata {
  date: string
  ogp?: OGPMetadata
}

export const render = (template: string, markdownContent: string, meta: Metadata) => {
  const dom = new JSDOM(template)
  const { document } = dom.window

  const blocks = mergeInlineBlocks(
    parseBlocks(markdownContent.split('\n'))
  )

  // set OGP metadate
  for (const prop of Object.keys(meta.ogp || {})) {
    const metaNode = document.createElement('meta')
    metaNode.setAttribute('property', prop)
    metaNode.setAttribute('content', meta.ogp[prop])
    document.head.append(metaNode)
  }

  // Set title
  const titleBlock = blocks.find(block => block.type === 'heading')
  if (titleBlock?.type === 'heading') {
    document.title = String(titleBlock.props.heading)

    // ogp
    const ogpMetaTitle = document.createElement('meta')
    ogpMetaTitle.setAttribute('property', 'og:title')
    ogpMetaTitle.setAttribute('content', titleBlock.props.heading)
    document.head.append(ogpMetaTitle)
  }

  // Set date
  const dateContainer = document.createElement('div')
  dateContainer.className = 'post__date'
  const date = document.createElement('time')
  date.setAttribute('datetime', meta.date)
  date.append(meta.date)
  dateContainer.append(date)

  // Render post
  const postNode = document.querySelector('.post')
  if (!postNode) {
    throw new Error('Element .post not found.')
  }
  postNode.append(dateContainer)
  renderBlocks(document, postNode, blocks)

  // Insert TOC
  const tocNode = document.createElement('section')
  tocNode.className = 'collapsible'
  const tocToggleInput = document.createElement('input')
  tocToggleInput.className = 'collapsible__toggle'
  tocToggleInput.setAttribute('id', 'toc-toggle')
  tocToggleInput.setAttribute('type', 'checkbox')
  tocToggleInput.setAttribute('checked', '')
  tocNode.append(tocToggleInput)
  const tocToggleLabel = document.createElement('label')
  tocToggleLabel.className = 'collapsible__label'
  tocToggleLabel.setAttribute('for', 'toc-toggle')
  tocToggleLabel.append('Table of contents')
  tocNode.append(tocToggleLabel)
  const tocUl = document.createElement('ul')
  tocUl.className = 'collapsible__content'
  tocNode.append(tocUl)
  const headings = blocks.filter((b) => b.type === 'heading' && b.props.level === 2)
  for (const heading of headings) {
    if (heading.type === 'heading') {
      const li = document.createElement('li')
      tocUl.append(li)
      const a = document.createElement('a')
      const id = makeId(heading.props.heading)
      a.setAttribute('href', `#${id}`)
      a.append(heading.props.heading)
      li.append(a)
    }
  }
  const titleNode = document.querySelector('h1')
  postNode.insertBefore(tocNode, titleNode.nextSibling)

  return dom
}

const renderBlocks = (document: Document, parentNode: Element, blocks: Block[]) => {
  for (const block of blocks) {
    switch (block.type) {
      case 'heading': {
        const heading = document.createElement(`h${block.props.level}`)
        heading.setAttribute('id', `${makeId(block.props.heading)}`)
        heading.append(block.props.heading)
        parentNode.append(heading)
        break
      }
      case 'horizontal_rule': {
        parentNode.append(document.createElement('hr'))
        break
      }
      case 'blockquote': {
        const blockquote = document.createElement('blockquote')
        renderBlocks(document, blockquote, block.contents)
        parentNode.append(blockquote)
        break
      }
      case 'unordered_list': {
        const ulist = document.createElement('ul')
        renderBlocks(document, ulist, block.contents)
        parentNode.append(ulist)
        break
      }
      case 'ordered_list': {
        const olist = document.createElement('ol')
        renderBlocks(document, olist, block.contents)
        parentNode.append(olist)
        break
      }
      case 'list_item': {
        const item = document.createElement('li')
        renderBlocks(document, item, block.contents)
        parentNode.append(item)
        break
      }
      case 'code_block': {
        // language label
        if (block.props.language) {
          const label = document.createElement('div')
          label.className = 'code-block__language-label'
          label.append(block.props.language)
          parentNode.append(label)
        }
        // pre, code
        const pre = document.createElement('pre')
        const code = document.createElement('code')
        code.append(block.props.code)
        pre.append(code)
        parentNode.append(pre)
        break
      }
      case 'table': {
        const table = document.createElement('table')
        parentNode.append(table)
        const header = document.createElement('tr')
        table.append(header)
        for (const col of block.props.header) {
          const th = document.createElement('th')
          header.append(th)
          for (const segment of col.segments) {
            const el = inlineSegmentToElement(document, segment)
            if (el) {
              th.append(el)
            }
          }
        }
        for (const row of block.props.rows) {
          const tr = document.createElement('tr')
          table.append(tr)
          for (let i = 0; i < row.length; i++) {
            const col = row[i]
            const td = document.createElement('td')
            td.style.textAlign = block.props.align[i]
            tr.append(td)
            for (const segment of col.segments) {
              const el = inlineSegmentToElement(document, segment)
              if (el) {
                td.append(el)
              }
            }
          }
        }
        break
      }
      case 'html':
        parentNode.insertAdjacentHTML('beforeend', block.props.html)
        break
      case 'inline': {
        if (['LI'].includes(parentNode.tagName)) {
          for (const segment of block.props.segments) {
            const element = inlineSegmentToElement(document, segment)
            if (element) {
              parentNode.append(element)
            }
          }
        } else {
          const paragraph = document.createElement('p')
          parentNode.append(paragraph)
          for (const segment of block.props.segments) {
            const element = inlineSegmentToElement(document, segment)
            if (element) {
              paragraph.append(element)
            }
          }
        }
        break
      }
      case 'empty_line':
        break
      default:
        console.warn('Cannot render block:', block)
    }
  }
}

const inlineSegmentToElement = (document: Document, segment: InlineSegment) => {
  switch (segment.type) {
    case 'link': {
      const link = document.createElement('a')
      link.setAttribute('href', segment.props.url)
      link.append(segment.props.text)
      return link
    }
    case 'image': {
      const imageLinkContainer = document.createElement('div')
      imageLinkContainer.className = 'image-link'
      const imageLink = document.createElement('a')
      imageLink.setAttribute('href', segment.props.src)
      imageLink.setAttribute('target', '_blank')
      imageLink.setAttribute('rel', 'noopener')
      imageLinkContainer.append(imageLink)
      const image = document.createElement('img')
      image.setAttribute('alt', segment.props.alt || '')
      image.setAttribute('src', segment.props.src)
      image.setAttribute('loading', 'lazy')
      imageLink.append(image)
      return imageLinkContainer
    }
    case 'bold': {
      const bold = document.createElement('b')
      bold.append(segment.props.text)
      return bold
    }
    case 'italic': {
      const italic = document.createElement('em')
      italic.append(segment.props.text)
      return italic
    }
    case 'code': {
      const code = document.createElement('code')
      code.append(segment.props.text)
      return code
    }
    case 'text': {
      return document.createTextNode(segment.props.text)
    }
    default:
      console.warn('Cannot convert segment:', segment)
  }
}

const mergeInlineBlocks = (blocks: Block[]): Block[] => {
  const merged: Block[] = []
  for (const block of blocks) {
    if (merged.length > 0 && merged[merged.length - 1].type === 'inline' && block.type === 'inline') {
      const previousBlock = merged[merged.length - 1] as InlineBlock
      const mergedSegments = previousBlock.props.segments.concat(
        [{ type: 'text', props: { text: ' ' } }],
        block.props.segments
      )
      previousBlock.props.segments = mergedSegments
    } else {
      merged.push(block)
    }
  }
  return merged
}

const makeId = cyrb53
