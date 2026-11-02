"use client";

import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Table as TableIcon,
  Underline,
  Undo2,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";

export function RichTextEditor({
  dir,
  content,
  editable,
  onChange,
}: {
  dir: "ltr" | "rtl";
  content: object;
  editable: boolean;
  onChange: (document: object) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editable,
    content,
    extensions: [
      StarterKit.configure({
        code: false,
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: false },
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: dir === "rtl" ? "اكتب وصف الخدمة" : "Write the service description" }),
    ],
    editorProps: {
      attributes: {
        dir,
        class: "rich-text min-h-64 px-4 py-3 outline-none",
        style: dir === "rtl" ? "text-align: right" : "text-align: left",
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getJSON()),
  });

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  function setLink() {
    if (!editor) {
      return;
    }

    const current = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("Link URL", current ?? "https://");

    if (href === null) {
      return;
    }

    if (href.trim() === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }

    if (!/^(https?:\/\/|mailto:|tel:)/i.test(href.trim())) {
      window.alert("Use an http, https, mailto, or tel link.");
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex flex-wrap gap-1 border-b border-line bg-canvas-muted p-2" role="toolbar" aria-label={dir === "rtl" ? "محرر الوصف العربي" : "English description editor"}>
        <Tool label="Bold" active={editor?.isActive("bold")} disabled={!editable} onClick={() => editor?.chain().focus().toggleBold().run()}>
          <Bold className="size-4" />
        </Tool>
        <Tool label="Italic" active={editor?.isActive("italic")} disabled={!editable} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <Italic className="size-4" />
        </Tool>
        <Tool label="Underline" active={editor?.isActive("underline")} disabled={!editable} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
          <Underline className="size-4" />
        </Tool>
        <Tool label="Strikethrough" active={editor?.isActive("strike")} disabled={!editable} onClick={() => editor?.chain().focus().toggleStrike().run()}>
          <Strikethrough className="size-4" />
        </Tool>
        <Tool label="Heading 1" active={editor?.isActive("heading", { level: 1 })} disabled={!editable} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 className="size-4" />
        </Tool>
        <Tool label="Heading 2" active={editor?.isActive("heading", { level: 2 })} disabled={!editable} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="size-4" />
        </Tool>
        <Tool label="Heading 3" active={editor?.isActive("heading", { level: 3 })} disabled={!editable} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="size-4" />
        </Tool>
        <Tool label="Bullet list" active={editor?.isActive("bulletList")} disabled={!editable} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          <List className="size-4" />
        </Tool>
        <Tool label="Numbered list" active={editor?.isActive("orderedList")} disabled={!editable} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="size-4" />
        </Tool>
        <Tool label="Quote" active={editor?.isActive("blockquote")} disabled={!editable} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
          <Quote className="size-4" />
        </Tool>
        <Tool label="Divider" disabled={!editable} onClick={() => editor?.chain().focus().setHorizontalRule().run()}>
          <Minus className="size-4" />
        </Tool>
        <Tool label="Link" active={editor?.isActive("link")} disabled={!editable} onClick={setLink}>
          <Link2 className="size-4" />
        </Tool>
        <Tool label="Insert table" disabled={!editable} onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          <TableIcon className="size-4" />
        </Tool>
        <Tool label="Add row" disabled={!editable} onClick={() => editor?.chain().focus().addRowAfter().run()}>
          +R
        </Tool>
        <Tool label="Add column" disabled={!editable} onClick={() => editor?.chain().focus().addColumnAfter().run()}>
          +C
        </Tool>
        <Tool label="Delete table" disabled={!editable} onClick={() => editor?.chain().focus().deleteTable().run()}>
          −T
        </Tool>
        <Tool label="Align left" active={editor?.isActive({ textAlign: "left" })} disabled={!editable} onClick={() => editor?.chain().focus().setTextAlign("left").run()}>
          <AlignLeft className="size-4" />
        </Tool>
        <Tool label="Align center" active={editor?.isActive({ textAlign: "center" })} disabled={!editable} onClick={() => editor?.chain().focus().setTextAlign("center").run()}>
          <AlignCenter className="size-4" />
        </Tool>
        <Tool label="Align right" active={editor?.isActive({ textAlign: "right" })} disabled={!editable} onClick={() => editor?.chain().focus().setTextAlign("right").run()}>
          <AlignRight className="size-4" />
        </Tool>
        <Tool label="Justify" active={editor?.isActive({ textAlign: "justify" })} disabled={!editable} onClick={() => editor?.chain().focus().setTextAlign("justify").run()}>
          <AlignJustify className="size-4" />
        </Tool>
        <ColorTool label="Text color" disabled={!editable} onPick={(color) => editor?.chain().focus().setColor(color).run()} />
        <ColorTool label="Highlight color" disabled={!editable} onPick={(color) => editor?.chain().focus().setHighlight({ color }).run()} icon={<Highlighter className="size-4" />} />
        <Tool label="Undo" disabled={!editable} onClick={() => editor?.chain().focus().undo().run()}>
          <Undo2 className="size-4" />
        </Tool>
        <Tool label="Redo" disabled={!editable} onClick={() => editor?.chain().focus().redo().run()}>
          <Redo2 className="size-4" />
        </Tool>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function Tool({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg px-2 text-xs font-semibold ${active ? "bg-white text-brand" : "text-ink hover:bg-white"} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {children}
    </button>
  );
}

function ColorTool({ label, disabled, onPick, icon }: { label: string; disabled?: boolean; onPick: (color: string) => void; icon?: ReactNode }) {
  return (
    <label title={label} className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg px-2 text-ink hover:bg-white">
      <span className="sr-only">{label}</span>
      {icon}
      <input
        type="color"
        aria-label={label}
        disabled={disabled}
        defaultValue="#157037"
        onChange={(event) => onPick(event.target.value)}
        className="size-6 cursor-pointer border-0 bg-transparent p-0 disabled:cursor-not-allowed"
      />
    </label>
  );
}
