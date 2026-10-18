// Minimal markdown renderer for assistant replies: headings, lists,
// paragraphs, fenced code, **bold**, *italic* and `code`.

function renderInline(text) {
  const parts = []
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g
  let last = 0, m
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[0].startsWith('**')) {
      parts.push(<strong key={m.index}>{m[0].slice(2, -2)}</strong>)
    } else if (m[0].startsWith('*')) {
      parts.push(<em key={m.index}>{m[0].slice(1, -1)}</em>)
    } else {
      parts.push(<code key={m.index}>{m[0].slice(1, -1)}</code>)
    }
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

export function renderContent(text) {
  if (!text) return null

  // 1. Extract fenced code blocks first
  const segments = []
  const codeRe = /```(\w*)\n?([\s\S]*?)```/g
  let cursor = 0, m
  while ((m = codeRe.exec(text)) !== null) {
    if (m.index > cursor) segments.push({ type: 'text', content: text.slice(cursor, m.index) })
    segments.push({ type: 'code', lang: m[1] || '', content: m[2] })
    cursor = m.index + m[0].length
  }
  if (cursor < text.length) segments.push({ type: 'text', content: text.slice(cursor) })

  const nodes = []

  segments.forEach((seg, si) => {
    if (seg.type === 'code') {
      nodes.push(
        <div key={`code-${si}`} className="md-code-block">
          {seg.lang && <div className="md-code-lang">{seg.lang}</div>}
          <pre><code>{seg.content.trim()}</code></pre>
        </div>
      )
      return
    }

    // 2. Process text segments line by line
    const lines = seg.content.split('\n')
    let i = 0
    while (i < lines.length) {
      const line = lines[i].trimEnd()

      if (line.trim() === '') { i++; continue }

      const h3 = line.match(/^###\s+(.+)/)
      const h2 = line.match(/^##\s+(.+)/)
      const h1 = line.match(/^#\s+(.+)/)
      if (h3) { nodes.push(<h3 key={`${si}-${i}`} className="md-h3">{renderInline(h3[1])}</h3>); i++; continue }
      if (h2) { nodes.push(<h2 key={`${si}-${i}`} className="md-h2">{renderInline(h2[1])}</h2>); i++; continue }
      if (h1) { nodes.push(<h1 key={`${si}-${i}`} className="md-h1">{renderInline(h1[1])}</h1>); i++; continue }

      // Unordered list (*, -, •)
      if (/^\s*[*\-•]\s/.test(line)) {
        const items = []
        while (i < lines.length && /^\s*[*\-•]\s/.test(lines[i].trimEnd())) {
          items.push(<li key={i}>{renderInline(lines[i].replace(/^\s*[*\-•]\s+/, '').trimEnd())}</li>)
          i++
        }
        nodes.push(<ul key={`${si}-ul-${i}`} className="md-ul">{items}</ul>)
        continue
      }

      // Ordered list (1. 2. etc)
      if (/^\d+\.\s/.test(line)) {
        const items = []
        while (i < lines.length && /^\d+\.\s/.test(lines[i].trimEnd())) {
          items.push(<li key={i}>{renderInline(lines[i].replace(/^\d+\.\s+/, '').trimEnd())}</li>)
          i++
        }
        nodes.push(<ol key={`${si}-ol-${i}`} className="md-ol">{items}</ol>)
        continue
      }

      // Paragraph: collect consecutive non-special lines
      const paraLines = []
      while (
        i < lines.length &&
        lines[i].trim() !== '' &&
        !/^\s*[*\-•]\s/.test(lines[i]) &&
        !/^\d+\.\s/.test(lines[i]) &&
        !/^#+\s/.test(lines[i])
      ) {
        paraLines.push(lines[i].trimEnd())
        i++
      }
      if (paraLines.length > 0) {
        nodes.push(<p key={`${si}-p-${i}`} className="md-p">{renderInline(paraLines.join(' '))}</p>)
      }
    }
  })

  return nodes
}
