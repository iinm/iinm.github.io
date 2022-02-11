import { parseBlocks } from './markdown'

describe('markdown', () => {
  it('detects html', () => {
    const markdownContent = `
<iframe src="https://iinm.github.io">
</iframe>

<table>
  <tr>
    <td>One</td>
    <td>Two</td>
    <td>Three</td>
  </tr>
</table>

<div class="parent">
  <div class="child">
  </div>
</div>
`.trim()

    const blocks = parseBlocks(markdownContent.split('\n'))

    expect(blocks).toMatchObject([
      {
        type: 'html',
        props: {
          html: '<iframe src="https://iinm.github.io">\n</iframe>\n'
        }
      },
      {
        type: 'empty_line'
      },
      {
        type: 'html',
        props: {
          html: `<table>
  <tr>
    <td>One</td>
    <td>Two</td>
    <td>Three</td>
  </tr>
</table>
`
        }
      },
      {
        type: 'empty_line'
      },
      {
        type: 'html',
        props: {
          html: `<div class="parent">
  <div class="child">
  </div>
</div>`
        }
      }
    ])
  })
})
