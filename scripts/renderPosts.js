const { render } = require('../src/renderer')
const fs = require('fs')

const template = fs.readFileSync('./templates/post.html', { encoding: 'utf-8', flag: 'r' })
fs.readdirSync('./posts').forEach(filename => {
  console.log(filename)
  const markdownContent = fs.readFileSync(`./posts/${filename}`, { encoding: 'utf-8', flag: 'r' })
  const dom = render(template, markdownContent, filename)
  fs.writeFileSync(`./docs/posts/${filename.replace(/\.md$/, '.html')}`, dom.serialize())
})
