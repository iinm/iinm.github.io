import * as markdown from '../modules/markdown.js'

const urlParams = new URLSearchParams(window.location.search)
const source = window.location.pathname + urlParams.get('post') + '.md'

fetch(source)
  .then(res => res.text())
  .then(markdownContent => markdown.parseBlocks(markdownContent))
  .then(blocks => console.log(JSON.stringify(blocks, null, 2)))
