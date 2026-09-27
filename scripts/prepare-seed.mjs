import fs from "node:fs";
const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
const sql = (value) =>
  value === null
    ? "null"
    : Array.isArray(value)
      ? "array[" + value.map(quote).join(",") + "]::text[]"
      : typeof value === "number"
        ? String(value)
        : quote(value);
let output =
  "-- Dados iniciais do acervo. Reexecutar não substitui a edição da curadoria.\nbegin;\n";
for (const table of ["books", "publications"]) {
  const records = JSON.parse(
    fs.readFileSync(
      new URL("../packages/domain/src/" + table + ".json", import.meta.url),
      "utf8",
    ),
  );
  for (const record of records) {
    const columns = Object.keys(record);
    output +=
      "insert into public." +
      table +
      "(" +
      columns.join(",") +
      ") values(" +
      columns.map((key) => sql(record[key])).join(",") +
      ") on conflict(id) do nothing;\n";
  }
}
output += "commit;\n";
fs.writeFileSync(new URL("../supabase/seed.sql", import.meta.url), output);
console.log("supabase/seed.sql preparado: 28 livros e 3 textos originais.");
