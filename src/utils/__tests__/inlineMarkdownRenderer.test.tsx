import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import {
  renderInlineMarkdown,
  hasInlineMarkdown,
} from '../inlineMarkdownRenderer'

describe('renderInlineMarkdown', () => {
  describe('リンク記法', () => {
    it('[text](url)をリンクとしてレンダリングする', () => {
      const result = renderInlineMarkdown('[Google](https://google.com)')
      const { container } = render(<span>{result}</span>)
      const link = container.querySelector('a')
      expect(link).toBeTruthy()
      expect(link?.textContent).toBe('Google')
      expect(link?.getAttribute('href')).toBe('https://google.com')
      expect(link?.getAttribute('title')).toBe('https://google.com')
    })

    it('リンクのクリックでwindow.openが呼ばれる', () => {
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
      const result = renderInlineMarkdown('[Test](https://example.com)')
      const { container } = render(<span>{result}</span>)
      const link = container.querySelector('a')

      fireEvent.click(link!)
      expect(openSpy).toHaveBeenCalledWith(
        'https://example.com',
        '_blank',
        'noopener,noreferrer',
      )
      openSpy.mockRestore()
    })

    it('リンクのクリックでstopPropagationが呼ばれる', () => {
      const result = renderInlineMarkdown('[Test](https://example.com)')
      const { container } = render(<span>{result}</span>)
      const link = container.querySelector('a')

      const clickEvent = new MouseEvent('click', { bubbles: true })
      const stopPropagationSpy = vi.spyOn(clickEvent, 'stopPropagation')
      link!.dispatchEvent(clickEvent)
      expect(stopPropagationSpy).toHaveBeenCalled()
    })

    it('httpプロトコルのリンクを許可する', () => {
      const result = renderInlineMarkdown('[Link](http://example.com)')
      const { container } = render(<span>{result}</span>)
      const link = container.querySelector('a')
      expect(link?.getAttribute('href')).toBe('http://example.com')
    })

    it('mailtoプロトコルのリンクを許可する', () => {
      const result = renderInlineMarkdown('[Email](mailto:test@example.com)')
      const { container } = render(<span>{result}</span>)
      const link = container.querySelector('a')
      expect(link?.getAttribute('href')).toBe('mailto:test@example.com')
    })

    it('javascriptプロトコルのリンクをプレーンテキストとしてレンダリングする', () => {
      const result = renderInlineMarkdown('[XSS](javascript:void)')
      const { container } = render(<span>{result}</span>)
      const link = container.querySelector('a')
      expect(link).toBeNull()
      expect(container.textContent).toBe('XSS')
    })

    it('dataプロトコルのリンクをプレーンテキストとしてレンダリングする', () => {
      const result = renderInlineMarkdown('[Data](data:text/html,<script>)')
      const { container } = render(<span>{result}</span>)
      const link = container.querySelector('a')
      expect(link).toBeNull()
    })
  })

  describe('太字記法', () => {
    it('**text**をstrongとしてレンダリングする', () => {
      const result = renderInlineMarkdown('**太字**')
      const { container } = render(<span>{result}</span>)
      const strong = container.querySelector('strong')
      expect(strong).toBeTruthy()
      expect(strong?.textContent).toBe('太字')
      expect(strong?.classList.contains('md-bold')).toBe(true)
    })
  })

  describe('打ち消し線記法', () => {
    it('~~text~~をdelとしてレンダリングする', () => {
      const result = renderInlineMarkdown('~~打ち消し~~')
      const { container } = render(<span>{result}</span>)
      const del = container.querySelector('del')
      expect(del).toBeTruthy()
      expect(del?.textContent).toBe('打ち消し')
      expect(del?.classList.contains('md-strikethrough')).toBe(true)
    })
  })

  describe('イタリック記法', () => {
    it('*text*をemとしてレンダリングする', () => {
      const result = renderInlineMarkdown('*イタリック*')
      const { container } = render(<span>{result}</span>)
      const em = container.querySelector('em')
      expect(em).toBeTruthy()
      expect(em?.textContent).toBe('イタリック')
      expect(em?.classList.contains('md-italic')).toBe(true)
    })
  })

  describe('インラインコード記法', () => {
    it('`code`をcodeとしてレンダリングする', () => {
      const result = renderInlineMarkdown('`const x = 1`')
      const { container } = render(<span>{result}</span>)
      const code = container.querySelector('code')
      expect(code).toBeTruthy()
      expect(code?.textContent).toBe('const x = 1')
      expect(code?.classList.contains('md-code')).toBe(true)
    })
  })

  describe('複合パターン', () => {
    it('複数の記法を混在してレンダリングする', () => {
      const result = renderInlineMarkdown(
        '**太字** と *イタリック* と ~~打ち消し~~',
      )
      const { container } = render(<span>{result}</span>)
      expect(container.querySelector('strong')?.textContent).toBe('太字')
      expect(container.querySelector('em')?.textContent).toBe('イタリック')
      expect(container.querySelector('del')?.textContent).toBe('打ち消し')
    })

    it('テキストとリンクを混在してレンダリングする', () => {
      const result = renderInlineMarkdown('詳細は[こちら](https://example.com)を参照')
      const { container } = render(<span>{result}</span>)
      expect(container.textContent).toBe('詳細はこちらを参照')
      const link = container.querySelector('a')
      expect(link?.textContent).toBe('こちら')
    })

    it('記法のないテキストはそのまま返す', () => {
      const result = renderInlineMarkdown('プレーンテキスト')
      expect(result).toHaveLength(1)
      expect(result[0]).toBe('プレーンテキスト')
    })

    it('空文字列は空配列を返す', () => {
      const result = renderInlineMarkdown('')
      expect(result).toHaveLength(0)
    })
  })
})

describe('hasInlineMarkdown', () => {
  it('リンク記法を検出する', () => {
    expect(hasInlineMarkdown('[text](url)')).toBe(true)
  })

  it('太字記法を検出する', () => {
    expect(hasInlineMarkdown('**bold**')).toBe(true)
  })

  it('打ち消し線記法を検出する', () => {
    expect(hasInlineMarkdown('~~strike~~')).toBe(true)
  })

  it('イタリック記法を検出する', () => {
    expect(hasInlineMarkdown('*italic*')).toBe(true)
  })

  it('インラインコード記法を検出する', () => {
    expect(hasInlineMarkdown('`code`')).toBe(true)
  })

  it('記法がないテキストでfalseを返す', () => {
    expect(hasInlineMarkdown('プレーンテキスト')).toBe(false)
  })
})
