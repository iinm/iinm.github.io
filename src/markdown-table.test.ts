import { parseBlocks } from './markdown'

describe('markdown', () => {
  it('detects table', () => {
    const markdownContent = `
| First Header  | Second Header |
| ------------- | ------------- |
| Content Cell  | Content Cell  |
| Content Cell  | Content Cell  |
`.trim()

    const blocks = parseBlocks(markdownContent.split('\n'))
    expect(blocks).toMatchObject([
      {
        type: 'table',
        props: {
          header: [
            {
              segments: [
                {
                  type: 'text',
                  props: {
                    text: 'First Header'
                  }
                }
              ]
            },
            {
              segments: [
                {
                  type: 'text',
                  props: {
                    text: 'Second Header'
                  }
                }
              ]
            }
          ],
          align: [
            'left',
            'left'
          ],
          rows: [
            [
              {
                segments: [
                  {
                    type: 'text',
                    props: {
                      text: 'Content Cell'
                    }
                  }
                ]
              },
              {
                segments: [
                  {
                    type: 'text',
                    props: {
                      text: 'Content Cell'
                    }
                  }
                ]
              }
            ],
            [
              {
                segments: [
                  {
                    type: 'text',
                    props: {
                      text: 'Content Cell'
                    }
                  }
                ]
              },
              {
                segments: [
                  {
                    type: 'text',
                    props: {
                      text: 'Content Cell'
                    }
                  }
                ]
              }
            ]
          ]
        }
      }
    ])
  })

  it('detects table with align', () => {
    const markdownContent = `
| Left-aligned | Center-aligned | Right-aligned |
| :---         |     :---:      |          ---: |
| git status   | git status     | git status    |
| git diff     | git diff       | git diff      |
`.trim()

    const blocks = parseBlocks(markdownContent.split('\n'))
    expect(blocks).toMatchObject([
      {
        type: 'table',
        props: {
          header: [
            {
              segments: [
                {
                  type: 'text',
                  props: {
                    text: 'Left-aligned'
                  }
                }
              ]
            },
            {
              segments: [
                {
                  type: 'text',
                  props: {
                    text: 'Center-aligned'
                  }
                }
              ]
            },
            {
              segments: [
                {
                  type: 'text',
                  props: {
                    text: 'Right-aligned'
                  }
                }
              ]
            }
          ],
          align: [
            'left',
            'center',
            'right'
          ],
          rows: [
            [
              {
                segments: [
                  {
                    type: 'text',
                    props: {
                      text: 'git status'
                    }
                  }
                ]
              },
              {
                segments: [
                  {
                    type: 'text',
                    props: {
                      text: 'git status'
                    }
                  }
                ]
              },
              {
                segments: [
                  {
                    type: 'text',
                    props: {
                      text: 'git status'
                    }
                  }
                ]
              }
            ],
            [
              {
                segments: [
                  {
                    type: 'text',
                    props: {
                      text: 'git diff'
                    }
                  }
                ]
              },
              {
                segments: [
                  {
                    type: 'text',
                    props: {
                      text: 'git diff'
                    }
                  }
                ]
              },
              {
                segments: [
                  {
                    type: 'text',
                    props: {
                      text: 'git diff'
                    }
                  }
                ]
              }
            ]
          ]
        }
      }
    ])
  })
})
