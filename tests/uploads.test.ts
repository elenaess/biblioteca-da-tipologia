import test from "node:test";
import assert from "node:assert/strict";
import { validatePdf } from "../packages/domain/src";

test("PDF upload validates extension, content and size before sending", async () => {
  await validatePdf(
    new File(["%PDF-1.7\nexample"], "livro.pdf", { type: "application/pdf" }),
  );
  await validatePdf(new File(["%PDF-1.7\nexample"], "livro.PDF", { type: "" }));
  await assert.rejects(
    validatePdf(
      new File(["<html>fake</html>"], "livro.pdf", { type: "application/pdf" }),
    ),
  );
  await assert.rejects(
    validatePdf(new File(["%PDF-1.7"], "livro.html", { type: "text/html" })),
  );
  await assert.rejects(
    validatePdf(
      new File([new Uint8Array(26 * 1024 * 1024)], "grande.pdf", {
        type: "application/pdf",
      }),
    ),
  );
});
