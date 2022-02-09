const markdown = require('./markdown')
const jsdom = require('jsdom')

const render = (template, markdownContent, meta) => {
  const dom = new jsdom.JSDOM(template)
  const { document } = dom.window

  const blocks = mergeInlineBlocks(
    markdown.parseBlocks(markdownContent.split('\n'))
  )

  // Set title
  const titleBlock = blocks.find(block => block.type === 'heading')
  if (titleBlock) {
    document.title = titleBlock.props.heading
  }

  const postNode = document.querySelector('.post')

  // Set date
  const dateContainer = document.createElement('div')
  dateContainer.className = 'post__date'
  const date = document.createElement('time')
  date.setAttribute('datetime', meta.date)
  date.appendChild(document.createTextNode(meta.date))
  dateContainer.appendChild(date)
  postNode.appendChild(dateContainer)

  renderBlocks(document, postNode, blocks)

  return dom
}

const renderBlocks = (document, parentNode, blocks) => {
  for (const block of blocks) {
    switch (block.type) {
      case 'heading': {
        const heading = document.createElement(`h${block.props.level}`)
        heading.append(document.createTextNode(block.props.heading))
        parentNode.appendChild(heading)
        break
      }
      case 'horizontal_rule': {
        parentNode.append(document.createElement('hr'))
        break
      }
      case 'blockquote': {
        const blockquote = document.createElement('blockquote')
        renderBlocks(document, blockquote, block.contents)
        parentNode.appendChild(blockquote)
        break
      }
      case 'unordered_list': {
        const ulist = document.createElement('ul')
        renderBlocks(document, ulist, block.contents)
        parentNode.appendChild(ulist)
        break
      }
      case 'ordered_list': {
        const olist = document.createElement('ol')
        renderBlocks(document, olist, block.contents)
        parentNode.appendChild(olist)
        break
      }
      case 'list_item': {
        const item = document.createElement('li')
        renderBlocks(document, item, block.contents)
        parentNode.appendChild(item)
        break
      }
      case 'code_block': {
        // language label
        if (block.props.language !== '') {
          const label = document.createElement('div')
          label.className = 'code-block__language-label'
          label.appendChild(document.createTextNode(block.props.language))
          parentNode.appendChild(label)
        }
        // pre, code
        const pre = document.createElement('pre')
        const code = document.createElement('code')
        code.append(document.createTextNode(block.props.code))
        pre.appendChild(code)
        parentNode.appendChild(pre)
        break
      }
      case 'inline': {
        if (['LI'].includes(parentNode.tagName)) {
          for (const segment of block.props.segments) {
            parentNode.appendChild(inlineSegmentToElement(document, segment))
          }
        } else {
          const paragraph = document.createElement('p')
          parentNode.appendChild(paragraph)
          for (const segment of block.props.segments) {
            paragraph.appendChild(inlineSegmentToElement(document, segment))
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

const inlineSegmentToElement = (document, segment) => {
  switch (segment.type) {
    case 'url': {
      const link = document.createElement('a')
      link.setAttribute('href', segment.props.url)
      link.appendChild(document.createTextNode(segment.props.text))
      return link
    }
    case 'image': {
      const imageLinkContainer = document.createElement('div')
      imageLinkContainer.className = 'image-link'
      const imageLink = document.createElement('a')
      imageLink.setAttribute('href', segment.props.src)
      imageLink.setAttribute('target', '_blank')
      imageLink.setAttribute('rel', 'noopener')
      imageLinkContainer.appendChild(imageLink)
      const image = document.createElement('img')
      image.setAttribute('alt', segment.props.alt)
      image.setAttribute('src', segment.props.src)
      image.setAttribute('loading', 'lazy')
      imageLink.appendChild(image)
      return imageLinkContainer
    }
    case 'bold': {
      const bold = document.createElement('b')
      bold.appendChild(document.createTextNode(segment.props.text))
      return bold
    }
    case 'italic': {
      const italic = document.createElement('em')
      italic.appendChild(document.createTextNode(segment.props.text))
      return italic
    }
    case 'code': {
      const code = document.createElement('code')
      code.appendChild(document.createTextNode(segment.props.text))
      return code
    }
    case 'text': {
      return document.createTextNode(segment.props.text)
    }
    default:
      console.warn('Cannot convert segment:', segment)
  }
}

const mergeInlineBlocks = (blocks) => {
  const merged = []
  for (const block of blocks) {
    if (merged.length > 0 && merged[merged.length - 1].type === 'inline' && block.type === 'inline') {
      const previousBlock = merged[merged.length - 1]
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

module.exports = {
  render
}
