const nodeTypes = new Set([
  "doc",
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "horizontalRule",
  "text",
  "hardBreak",
  "table",
  "tableRow",
  "tableCell",
  "tableHeader",
]);

const markTypes = new Set(["bold", "italic", "underline", "strike", "textStyle", "highlight", "link"]);
const alignments = new Set(["left", "center", "right", "justify"]);
const colorPattern = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export type RichMark = { type: string; attrs?: Record<string, string> };
export type RichNode = {
  type: string;
  text?: string;
  attrs?: Record<string, string | number>;
  marks?: RichMark[];
  content?: RichNode[];
};

export const emptyDocument: RichNode = { type: "doc", content: [{ type: "paragraph" }] };

export class RichTextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RichTextError";
  }
}

function safeHref(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const href = value.trim();

  if (/^(https?:\/\/|mailto:|tel:)/i.test(href) && !href.toLowerCase().startsWith("javascript:")) {
    return href;
  }

  return null;
}

function cleanMarks(marks: unknown): RichMark[] | undefined {
  if (marks === undefined) {
    return undefined;
  }

  if (!Array.isArray(marks)) {
    throw new RichTextError("The description contains unsupported formatting.");
  }

  const cleaned: RichMark[] = [];

  for (const mark of marks) {
    if (!mark || typeof mark !== "object" || !markTypes.has(String((mark as { type?: string }).type))) {
      throw new RichTextError("The description contains unsupported formatting.");
    }

    const type = String((mark as { type: string }).type);
    const attrs = (mark as { attrs?: Record<string, unknown> }).attrs ?? {};

    if (type === "link") {
      const href = safeHref(attrs.href);

      if (!href) {
        throw new RichTextError("Links must use http, https, mailto, or tel.");
      }

      cleaned.push({ type, attrs: { href } });
      continue;
    }

    if (type === "textStyle" || type === "highlight") {
      const color = typeof attrs.color === "string" && colorPattern.test(attrs.color) ? attrs.color : null;

      if (!color) {
        throw new RichTextError("Choose a color from the editor palette.");
      }

      cleaned.push({ type, attrs: { color } });
      continue;
    }

    cleaned.push({ type });
  }

  return cleaned;
}

function cleanNode(value: unknown, depth: number, budget: { count: number }): RichNode {
  budget.count += 1;

  if (budget.count > 2000 || depth > 20 || !value || typeof value !== "object" || Array.isArray(value)) {
    throw new RichTextError("The description is too large or is not valid.");
  }

  const record = value as { type?: unknown; text?: unknown; attrs?: Record<string, unknown>; marks?: unknown; content?: unknown };

  if (typeof record.type !== "string" || !nodeTypes.has(record.type)) {
    throw new RichTextError("The description contains unsupported content.");
  }

  const node: RichNode = { type: record.type };

  if (record.type === "text") {
    if (typeof record.text !== "string" || record.text.length > 20000) {
      throw new RichTextError("The description contains unsupported content.");
    }

    node.text = record.text;
    node.marks = cleanMarks(record.marks);
    return node;
  }

  if (record.type === "heading") {
    const level = Number(record.attrs?.level);

    if (![1, 2, 3].includes(level)) {
      throw new RichTextError("Headings must be H1, H2, or H3.");
    }

    node.attrs = { level };
  }

  if (record.type === "paragraph" || record.type === "heading") {
    const align = record.attrs?.textAlign;

    if (typeof align === "string") {
      if (!alignments.has(align)) {
        throw new RichTextError("The description contains unsupported alignment.");
      }

      node.attrs = { ...node.attrs, textAlign: align };
    }
  }

  if (record.type === "tableCell" || record.type === "tableHeader") {
    const colspan = Number(record.attrs?.colspan ?? 1);
    const rowspan = Number(record.attrs?.rowspan ?? 1);

    if (!Number.isInteger(colspan) || !Number.isInteger(rowspan) || colspan < 1 || colspan > 10 || rowspan < 1 || rowspan > 10) {
      throw new RichTextError("The table layout is not valid.");
    }

    node.attrs = { colspan, rowspan };
  }

  if (Array.isArray(record.content)) {
    node.content = record.content.map((child) => cleanNode(child, depth + 1, budget));
  }

  return node;
}

export function sanitizeRichText(value: unknown): RichNode {
  const document = cleanNode(value ?? emptyDocument, 0, { count: 0 });

  if (document.type !== "doc") {
    throw new RichTextError("The description is not valid.");
  }

  return document;
}
