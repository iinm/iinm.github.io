import * as markdown from '../modules/markdown.js'

window.onload = () => {
  const urlParams = new URLSearchParams(window.location.search)
  const source = window.location.pathname + urlParams.get('post') + '.md'

  fetch(source)
    .then(res => res.text())
    .then(markdownContent => markdown.parseBlocks(markdownContent.split('\n')))
    .then(mergeInlineBlocks)
    .then(blocks => {
      // Set title
      const titleBlock = blocks.find(block => block.type === 'heading')
      if (titleBlock) {
        document.title = titleBlock.props.heading
      }
      // Hide loading screen
      const loadingScreen = document.querySelector('.loading-screen')
      loadingScreen.style.display = 'none'
      // Render post
      renderBlocks(document.querySelector('.post'), blocks)
    })
    .catch(console.error)
}

const renderBlocks = (parentNode, blocks) => {
  for (const block of blocks) {
    switch (block.type) {
      case 'heading':
        const heading = document.createElement(`h${block.props.level}`)
        heading.append(document.createTextNode(block.props.heading))
        parentNode.appendChild(heading)
        break
      case 'horizontal_rule':
        parentNode.append(document.createElement('hr'))
        break
      case 'blockquote':
        const blockquote = document.createElement('blockquote')
        renderBlocks(blockquote, block.contents)
        parentNode.appendChild(blockquote)
        break
      case 'unordered_list':
        const ulist = document.createElement('ul')
        renderBlocks(ulist, block.contents)
        parentNode.appendChild(ulist)
        break
      case 'ordered_list':
        const olist = document.createElement('ol')
        renderBlocks(olist, block.contents)
        parentNode.appendChild(olist)
        break
      case 'list_item':
        const item = document.createElement('li')
        renderBlocks(item, block.contents)
        parentNode.appendChild(item)
        break
      case 'code_block':
        const pre = document.createElement('pre')
        const code = document.createElement('code')
        code.append(document.createTextNode(block.props.code))
        pre.appendChild(code)
        parentNode.appendChild(pre)
        break
      case 'inline':
        if (['LI'].includes(parentNode.tagName)) {
          for (const segment of block.props.segments) {
            parentNode.appendChild(inlineSegmentToElement(segment))
          }
        } else {
          const paragraph = document.createElement('p')
          parentNode.appendChild(paragraph)
          for (const segment of block.props.segments) {
            paragraph.appendChild(inlineSegmentToElement(segment))
          }
        }
        break
      case 'empty_line':
        break
      default:
        console.warn('Cannot render block:', block)
    }
  }
}

const inlineSegmentToElement = (segment) => {
  switch (segment.type) {
    case 'url':
      const link = document.createElement('a')
      link.setAttribute('href', segment.props.url)
      link.appendChild(document.createTextNode(segment.props.text))
      return link
    case 'image':
      const image = document.createElement('img')
      image.setAttribute('alt', segment.props.alt)
      image.setAttribute('src', segment.props.src)
      return image
    case 'bold':
      const bold = document.createElement('b')
      bold.appendChild(document.createTextNode(segment.props.text))
      return bold
    case 'italic':
      const italic = document.createElement('em')
      italic.appendChild(document.createTextNode(segment.props.text))
      return italic
    case 'text':
      return document.createTextNode(segment.props.text)
    default:
      console.warn('Cannot convert segment:', segment)
  }
}

const mergeInlineBlocks = (blocks) => {
  const merged = []
  for (const block of blocks) {
    if (merged.length > 0 && merged[merged.length-1].type == 'inline' && block.type == 'inline') {
      const previousBlock = merged[merged.length-1]
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
