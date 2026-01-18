import type { ListItem, ParsedMarkdown } from '../types/markdown';

const LIST_ITEM_REGEX = /^(\s*)([-*+]|\d+\.)\s+(.+)$/;

interface RawListItem {
  text: string;
  indent: number;
  listType: 'unordered' | 'ordered';
  lineNumber: number;
}

function calculateIndentLevel(indent: string): number {
  const spaces = indent.replace(/\t/g, '    ').length;
  return Math.floor(spaces / 2);
}

function tokenize(markdown: string): RawListItem[] {
  const lines = markdown.split('\n');
  const items: RawListItem[] = [];

  lines.forEach((line, index) => {
    const match = line.match(LIST_ITEM_REGEX);
    if (match) {
      const [, indent, marker, text] = match;
      items.push({
        text: text.trim(),
        indent: calculateIndentLevel(indent),
        listType: /^\d+\.$/.test(marker) ? 'ordered' : 'unordered',
        lineNumber: index + 1,
      });
    }
  });

  return items;
}

function buildTree(items: RawListItem[]): ListItem[] {
  const root: ListItem[] = [];
  const stack: { item: ListItem; level: number }[] = [];

  items.forEach((raw) => {
    const item: ListItem = {
      id: `node-${raw.lineNumber}`,
      text: raw.text,
      level: raw.indent,
      lineNumber: raw.lineNumber,
      listType: raw.listType,
      children: [],
    };

    while (stack.length > 0 && stack[stack.length - 1].level >= raw.indent) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(item);
    } else {
      stack[stack.length - 1].item.children.push(item);
    }

    stack.push({ item, level: raw.indent });
  });

  return root;
}

export function parseMarkdown(markdown: string): ParsedMarkdown {
  const tokens = tokenize(markdown);
  const items = buildTree(tokens);

  return {
    items,
    rawText: markdown,
  };
}
