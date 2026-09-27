import { useState } from "react";
import type { Book } from "../../../../packages/domain/src";
import { topicLabel } from "../../../../packages/domain/src";
const tones = [
  "#78513e",
  "#566049",
  "#9b6749",
  "#454b3b",
  "#875041",
  "#75674e",
];
export default function BookCover({
  book,
  small = false,
}: {
  book: Book;
  small?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const tone = tones[book.title.charCodeAt(0) % tones.length];
  return (
    <div
      className={"book-cover " + (small ? "small" : "")}
      style={{ backgroundColor: tone }}
    >
      {book.cover_url && !failed ? (
        <img
          src={book.cover_url}
          alt={"Capa de " + book.title}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="type-cover">
          <span className="cover-topic">
            {book.topics.length ? topicLabel(book.topics[0]) : "Acervo"}
          </span>
          <div className="cover-rule" />
          <strong>{book.title}</strong>
          <span className="cover-author">
            {book.authors.join(" · ") || "Biblioteca da Tipologia"}
          </span>
          <span className="cover-caption">CAPA A CADASTRAR</span>
        </div>
      )}
    </div>
  );
}
