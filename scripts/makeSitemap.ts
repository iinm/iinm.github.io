import fs from 'fs'

const links = []
const baseURL = 'https://iinm.github.io'
links.push(baseURL)

fs.readdirSync('./docs/posts').forEach((filename: string) => {
  if (!filename.endsWith('.html')) {
    return
  }
  links.push(`${baseURL}/posts/${filename}`)
})

fs.writeFileSync('./docs/sitemap.txt', links.join('\n'))
