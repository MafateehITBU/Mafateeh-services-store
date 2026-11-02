import type { RichMark, RichNode } from "@/features/services/rich-text";
import type { CSSProperties, ReactNode } from "react";

function markStyle(marks: RichMark[] | undefined): CSSProperties {
  const style: CSSProperties = {};

  for (const mark of marks ?? []) {
    if (mark.type === "bold") {
      style.fontWeight = 700;
    }

    if (mark.type === "italic") {
      style.fontStyle = "italic";
    }

    if (mark.type === "underline") {
      style.textDecoration = style.textDecoration ? `${style.textDecoration} underline` : "underline";
    }

    if (mark.type === "strike") {
      style.textDecoration = style.textDecoration ? `${style.textDecoration} line-through` : "line-through";
    }

    if (mark.type === "textStyle" && mark.attrs?.color) {
      style.color = mark.attrs.color;
    }

    if (mark.type === "highlight" && mark.attrs?.color) {
      style.backgroundColor = mark.attrs.color;
    }
  }

  return style;
}

function alignment(node: RichNode, dir: "ltr" | "rtl"): CSSProperties {
  const align = node.attrs?.textAlign;

  if (align === "left" || align === "center" || align === "right" || align === "justify") {
    return { textAlign: align };
  }

  return { textAlign: dir === "rtl" ? "right" : "left" };
}

export function RichTextView({
  document,
  className,
  dir = "ltr",
}: {
  document: RichNode;
  className?: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div dir={dir} className={className ? `rich-text ${className}` : "rich-text"}>
      {renderNodes(document.content ?? [], dir)}
    </div>
  );
}

function renderNodes(nodes: RichNode[], dir: "ltr" | "rtl"): ReactNode[] {
  return nodes.map((node, index) => renderNode(node, index, dir));
}

function renderNode(node: RichNode, key: number, dir: "ltr" | "rtl"): ReactNode {
  const children = node.content ? renderNodes(node.content, dir) : null;

  if (node.type === "text") {
    const link = node.marks?.find((mark) => mark.type === "link");
    const style = markStyle(node.marks);

    if (link?.attrs?.href) {
      return (
        <a key={key} href={link.attrs.href} style={style} rel="noopener noreferrer">
          {node.text}
        </a>
      );
    }

    return (
      <span key={key} style={style}>
        {node.text}
      </span>
    );
  }

  if (node.type === "paragraph") {
    return (
      <p key={key} style={alignment(node, dir)}>
        {children}
      </p>
    );
  }

  if (node.type === "heading") {
    const level = node.attrs?.level === 1 || node.attrs?.level === 2 ? node.attrs.level : 3;
    const Tag = `h${level}` as "h1" | "h2" | "h3";

    return (
      <Tag key={key} style={alignment(node, dir)}>
        {children}
      </Tag>
    );
  }

  if (node.type === "bulletList") {
    return <ul key={key}>{children}</ul>;
  }

  if (node.type === "orderedList") {
    return <ol key={key}>{children}</ol>;
  }

  if (node.type === "listItem") {
    return <li key={key}>{children}</li>;
  }

  if (node.type === "blockquote") {
    return <blockquote key={key}>{children}</blockquote>;
  }

  if (node.type === "horizontalRule") {
    return <hr key={key} />;
  }

  if (node.type === "hardBreak") {
    return <br key={key} />;
  }

  if (node.type === "table") {
    return (
      <table key={key}>
        <tbody>{children}</tbody>
      </table>
    );
  }

  if (node.type === "tableRow") {
    return <tr key={key}>{children}</tr>;
  }

  if (node.type === "tableHeader" || node.type === "tableCell") {
    const Tag = node.type === "tableHeader" ? "th" : "td";
    const colspan = typeof node.attrs?.colspan === "number" ? node.attrs.colspan : undefined;
    const rowspan = typeof node.attrs?.rowspan === "number" ? node.attrs.rowspan : undefined;

    return (
      <Tag key={key} colSpan={colspan} rowSpan={rowspan}>
        {children}
      </Tag>
    );
  }

  return <span key={key}>{children}</span>;
}
