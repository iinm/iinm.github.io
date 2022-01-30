export const render = async ({ modules: { markdown } }) => {
  const postId = window.location.pathname.split('/').at(-1).split('.')[0];
  const source = '/posts/' + postId + '.md'
  const loadingScreen = document.querySelector('.loading-screen')

  const response = await fetch(source)
  if (!response.ok) {
    // Set title
    document.title = `${response.status}`
    // Hide loading screen
    loadingScreen.style.display = 'none'
    // Show error screen
    const errorScreen = document.querySelector('.error-screen')
    const statusCode = document.querySelector('.error-screen__status-code')
    statusCode.appendChild(document.createTextNode(`${response.status}`))
    errorScreen.style.display = 'block'
    return
  }

  const markdownContent = await response.text()
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
  const dateMatch = postId.match(/^\d{4}-\d{2}-\d{2}/)
  if (dateMatch !== null) {
    const dateContainer = document.createElement('div')
    dateContainer.className = 'post__date'
    const date = document.createElement('time')
    date.setAttribute('datetime', dateMatch[0])
    date.appendChild(document.createTextNode(dateMatch[0]))
    dateContainer.appendChild(date)
    postNode.appendChild(dateContainer)
  }

  // Hide loading screen
  loadingScreen.style.display = 'none'

  // Render navigation
  const navigation = document.createElement('div')
  navigation.className = 'navigation'
  const link = document.createElement('a')
  link.setAttribute('href', '/')
  link.appendChild(document.createTextNode('Back to Index'))
  navigation.appendChild(link)
  document.querySelector('nav').appendChild(navigation)

  // Render post
  renderBlocks(postNode, blocks)
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
    case 'bold':
      const bold = document.createElement('b')
      bold.appendChild(document.createTextNode(segment.props.text))
      return bold
    case 'italic':
      const italic = document.createElement('em')
      italic.appendChild(document.createTextNode(segment.props.text))
      return italic
    case 'code':
      const code = document.createElement('code')
      code.appendChild(document.createTextNode(segment.props.text))
      return code
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
