import { useRef, useState } from "react";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import {
  TextStyle,
  Color,
  FontFamily,
  FontSize,
} from "@tiptap/extension-text-style";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Link2,
  ImagePlus,
  Undo2,
  Redo2,
  Table2,
} from "lucide-react";
const ContentImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (e) => e.getAttribute("width") || e.style.width,
        renderHTML: (a) =>
          a.width
            ? {
                style:
                  "width:" +
                  (/^\d+$/.test(a.width) ? a.width + "px" : a.width) +
                  ";max-width:100%;height:auto",
              }
            : {},
      },
    };
  },
});
export default function RichEditor({
  value,
  onChange,
  upload,
  onBusyChange,
}: {
  value: string;
  onChange: (v: string) => void;
  upload: (file: File) => Promise<string>;
  onBusyChange?: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      ContentImage.configure({ inline: true, allowBase64: true }),
      TableKit,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { "aria-label": "Conteúdo do texto", class: "rich-content" },
      handlePaste: (_view, event) => {
        const image = Array.from(event.clipboardData?.files || []).find((f) =>
          f.type.startsWith("image/"),
        );
        if (!image) return false;
        void insertImage(image);
        return true;
      },
    },
  });
  useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold"),
      selection: editor?.state.selection.from,
      html: editor?.getHTML(),
    }),
  });
  async function insertImage(file: File) {
    if (!editor || busy) return;
    const at = editor.state.selection.from;
    setError("");
    setBusy(true);
    onBusyChange?.(true);
    try {
      const src = await upload(file);
      const alt =
        prompt("Descrição da imagem (acessibilidade):", "Imagem do texto") ??
        "Imagem do texto";
      editor
        .chain()
        .focus()
        .insertContentAt(at, [
          {
            type: "paragraph",
            content: [{ type: "image", attrs: { src, alt, width: "100%" } }],
          },
          { type: "paragraph" },
        ])
        .run();
      onChange(editor.getHTML());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível inserir a imagem.",
      );
    } finally {
      setBusy(false);
      onBusyChange?.(false);
      if (input.current) input.current.value = "";
    }
  }
  if (!editor) return <p>Carregando editor…</p>;
  const button = (
    label: string,
    Icon: any,
    action: () => void,
    active = false,
  ) => (
    <button
      type="button"
      key={label}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={active ? "selected" : ""}
      onClick={action}
    >
      <Icon size={18} />
    </button>
  );
  return (
    <div className="editor">
      <div
        className="editor-toolbar"
        role="toolbar"
        aria-label="Formatação do texto"
      >
        <select
          aria-label="Estilo do parágrafo"
          value={
            editor.isActive("heading", { level: 1 })
              ? "1"
              : editor.isActive("heading", { level: 2 })
                ? "2"
                : editor.isActive("heading", { level: 3 })
                  ? "3"
                  : "p"
          }
          onChange={(e) =>
            e.target.value === "p"
              ? editor.chain().focus().setParagraph().run()
              : editor
                  .chain()
                  .focus()
                  .toggleHeading({ level: Number(e.target.value) as 1 | 2 | 3 })
                  .run()
          }
        >
          <option value="p">Texto normal</option>
          <option value="1">Título 1</option>
          <option value="2">Título 2</option>
          <option value="3">Título 3</option>
        </select>
        {button(
          "Negrito",
          Bold,
          () => {
            editor.chain().focus().toggleBold().run();
          },
          editor.isActive("bold"),
        )}
        {button(
          "Itálico",
          Italic,
          () => {
            editor.chain().focus().toggleItalic().run();
          },
          editor.isActive("italic"),
        )}
        {button(
          "Sublinhado",
          Underline,
          () => {
            editor.chain().focus().toggleUnderline().run();
          },
          editor.isActive("underline"),
        )}
        {button(
          "Tachado",
          Strikethrough,
          () => {
            editor.chain().focus().toggleStrike().run();
          },
          editor.isActive("strike"),
        )}
        <span className="toolbar-divider" />
        {[
          ["left", "Alinhar à esquerda", AlignLeft],
          ["center", "Centralizar", AlignCenter],
          ["right", "Alinhar à direita", AlignRight],
          ["justify", "Justificar", AlignJustify],
        ].map(([align, label, Icon]) =>
          button(
            label as string,
            Icon,
            () => {
              editor
                .chain()
                .focus()
                .setTextAlign(align as string)
                .run();
            },
            editor.isActive({ textAlign: align }),
          ),
        )}
        <span className="toolbar-divider" />
        {button(
          "Lista com marcadores",
          List,
          () => {
            editor.chain().focus().toggleBulletList().run();
          },
          editor.isActive("bulletList"),
        )}
        {button(
          "Lista numerada",
          ListOrdered,
          () => {
            editor.chain().focus().toggleOrderedList().run();
          },
          editor.isActive("orderedList"),
        )}
        {button(
          "Citação",
          Quote,
          () => {
            editor.chain().focus().toggleBlockquote().run();
          },
          editor.isActive("blockquote"),
        )}
        {button(
          "Inserir link",
          Link2,
          () => {
            const href = prompt(
              "Endereço HTTPS do link:",
              editor.getAttributes("link").href || "https://",
            );
            if (href === null) return;
            if (!href) {
              editor.chain().focus().unsetLink().run();
              return;
            }
            if (!/^https:\/\//i.test(href)) {
              setError("Use um endereço HTTPS.");
              return;
            }
            editor.chain().focus().setLink({ href }).run();
          },
          editor.isActive("link"),
        )}
        {button("Inserir imagem", ImagePlus, () => input.current?.click())}
        {button("Inserir tabela", Table2, () => {
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 2, withHeaderRow: true })
            .run();
        })}
        {button("Desfazer", Undo2, () => {
          editor.chain().focus().undo().run();
        })}
        {button("Refazer", Redo2, () => {
          editor.chain().focus().redo().run();
        })}
        <input
          ref={input}
          hidden
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            if (e.target.files?.[0]) void insertImage(e.target.files[0]);
          }}
        />
      </div>
      {editor.isActive("image") && (
        <div className="image-controls">
          <label>
            Largura da imagem{" "}
            <select
              onChange={(e) =>
                editor
                  .chain()
                  .focus()
                  .updateAttributes("image", { width: e.target.value })
                  .run()
              }
              defaultValue="100%"
            >
              <option>100%</option>
              <option>75%</option>
              <option>50%</option>
              <option>25%</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteSelection().run()}
          >
            Remover imagem
          </button>
        </div>
      )}
      {editor.isActive("table") && (
        <div className="image-controls">
          <button
            type="button"
            onClick={() => editor.chain().focus().addRowAfter().run()}
          >
            Adicionar linha
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
          >
            Adicionar coluna
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteTable().run()}
          >
            Remover tabela
          </button>
        </div>
      )}
      {busy && <div className="inline-note">Enviando imagem…</div>}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
