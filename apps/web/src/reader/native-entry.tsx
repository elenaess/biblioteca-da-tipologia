import React from "react";
import { createRoot } from "react-dom/client";
import BookReader from "./BookReader";
import type { ReaderAPI } from "../../../../packages/domain/src/reader";
declare global {
  interface Window {
    ReactNativeWebView?: { postMessage(s: string): void };
    __readerReceive?: (r: {
      id: number;
      value: unknown;
      error?: string;
    }) => void;
    __readerConfig?: { id: string; title: string };
  }
}
let sequence = 0;
const pending = new Map<
  number,
  { ok: (v: any) => void; fail: (e: Error) => void }
>();
window.__readerReceive = (r) => {
  const p = pending.get(r.id);
  if (!p) return;
  pending.delete(r.id);
  r.error ? p.fail(Error(r.error)) : p.ok(r.value);
};
function request(method: string, value?: unknown): Promise<any> {
  const id = ++sequence;
  return new Promise((ok, fail) => {
    pending.set(id, { ok, fail });
    window.ReactNativeWebView?.postMessage(
      JSON.stringify({ id, method, value }),
    );
    setTimeout(() => {
      if (pending.delete(id))
        fail(Error("A conexão demorou. Tente novamente."));
    }, 25000);
  });
}
const api: ReaderAPI = {
  manifest: () => request("manifest"),
  chapter: (id) => request("chapter", id),
  position: () => request("position"),
  save: (p) => request("save", p),
  original: () => request("original"),
};
const config = window.__readerConfig!;
createRoot(document.getElementById("root")!).render(
  <BookReader
    bookId={config.id}
    title={config.title}
    api={api}
    onClose={() => void request("close")}
  />,
);
