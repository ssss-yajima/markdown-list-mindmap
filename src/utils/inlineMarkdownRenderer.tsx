import type { ReactNode } from 'react'

/**
 * Check if a URL is safe (only allow http, https, mailto protocols)
 */
const isSafeUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url, 'https://example.com')
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

/**
 * Pattern definitions for inline Markdown elements
 * Order matters: more specific patterns should come first
 */
const INLINE_PATTERNS = [
  // Link: [text](url)
  {
    pattern: /\[([^\]]+)\]\(([^)]+)\)/,
    render: (match: RegExpMatchArray, key: number): ReactNode => {
      const text = match[1]
      const href = match[2]

      if (!isSafeUrl(href)) {
        return <span key={key}>{text}</span>
      }

      const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        window.open(href, '_blank', 'noopener,noreferrer')
      }

      const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation()
      }

      return (
        <a
          key={key}
          href={href}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          className="md-link"
          title={href}
        >
          {text}
        </a>
      )
    },
  },
  // Bold: **text**
  {
    pattern: /\*\*([^*]+)\*\*/,
    render: (match: RegExpMatchArray, key: number): ReactNode => (
      <strong key={key} className="md-bold">
        {match[1]}
      </strong>
    ),
  },
  // Strikethrough: ~~text~~
  {
    pattern: /~~([^~]+)~~/,
    render: (match: RegExpMatchArray, key: number): ReactNode => (
      <del key={key} className="md-strikethrough">
        {match[1]}
      </del>
    ),
  },
  // Italic: *text* (must come after bold to avoid conflicts)
  {
    pattern: /\*([^*]+)\*/,
    render: (match: RegExpMatchArray, key: number): ReactNode => (
      <em key={key} className="md-italic">
        {match[1]}
      </em>
    ),
  },
  // Inline code: `code`
  {
    pattern: /`([^`]+)`/,
    render: (match: RegExpMatchArray, key: number): ReactNode => (
      <code key={key} className="md-code">
        {match[1]}
      </code>
    ),
  },
]

/**
 * Find the first matching pattern in the text
 */
const findFirstMatch = (
  text: string,
): { patternIndex: number; match: RegExpMatchArray; index: number } | null => {
  let firstMatch: {
    patternIndex: number
    match: RegExpMatchArray
    index: number
  } | null = null

  for (let i = 0; i < INLINE_PATTERNS.length; i++) {
    const { pattern } = INLINE_PATTERNS[i]
    const match = text.match(pattern)
    if (match && match.index !== undefined) {
      if (firstMatch === null || match.index < firstMatch.index) {
        firstMatch = { patternIndex: i, match, index: match.index }
      }
    }
  }

  return firstMatch
}

/**
 * Render inline Markdown elements in text as React elements
 */
export const renderInlineMarkdown = (text: string): ReactNode[] => {
  const elements: ReactNode[] = []
  let remaining = text
  let keyCounter = 0

  while (remaining.length > 0) {
    const found = findFirstMatch(remaining)

    if (!found) {
      // No more patterns found, add remaining text
      if (remaining) {
        elements.push(remaining)
      }
      break
    }

    const { patternIndex, match, index } = found
    const patternDef = INLINE_PATTERNS[patternIndex]

    // Add text before the match
    if (index > 0) {
      elements.push(remaining.substring(0, index))
    }

    // Render the matched pattern
    elements.push(patternDef.render(match, keyCounter++))

    // Continue with the rest of the text
    remaining = remaining.substring(index + match[0].length)
  }

  return elements
}

/**
 * Check if text contains any inline Markdown syntax
 */
export const hasInlineMarkdown = (text: string): boolean => {
  return INLINE_PATTERNS.some(({ pattern }) => pattern.test(text))
}
