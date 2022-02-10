import { render } from '../src/renderer'
import fs from 'fs'

const template = fs.readFileSync('./templates/posts/index.html', { encoding: 'utf-8', flag: 'r' })
fs.readdirSync('./posts').forEach((filename: string) => {
  console.log(filename)
  const markdownContent = fs.readFileSync(`./posts/${filename}`, { encoding: 'utf-8', flag: 'r' })
  const date = filename.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  if (!date) {
    throw new Error(`Cannot get date from filename, ${filename}`)
  }
  const dom = render(template, markdownContent, { date })
  fs.writeFileSync(`./docs/posts/${filename.replace(/\.md$/, '.html')}`, dom.serialize())
})
