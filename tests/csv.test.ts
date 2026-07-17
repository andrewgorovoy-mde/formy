import { describe, it, expect } from "vitest";
import { csvCell, buildResponsesCsv, exportFilename } from "@/lib/csv";
import type { FieldDef } from "@/lib/types";

function field(key: string, label: string): FieldDef {
  return { id: key, key, order: 0, type: "short_text", label, guidance: "", required: false, options: [], constraints: {} };
}

describe("csvCell", () => {
  it("passes through simple values", () => {
    expect(csvCell("hello")).toBe("hello");
    expect(csvCell(42)).toBe("42");
  });
  it("renders booleans and arrays readably", () => {
    expect(csvCell(true)).toBe("Yes");
    expect(csvCell(["a", "b"])).toBe("a; b");
  });
  it("quotes and escapes values with commas, quotes, or newlines", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('she said "hi"')).toBe('"she said ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });
  it("renders empty for null/undefined", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });
});

describe("buildResponsesCsv", () => {
  const fields = [field("full_name", "Full name"), field("areas", "Areas"), field("agree", "Agree?")];

  it("builds a header + one row per submission with meta columns", () => {
    const csv = buildResponsesCsv(fields, [
      {
        answers: { full_name: "Drew, Jr.", areas: ["Climate", "Policy"], agree: true },
        source: "agent",
        agentName: "scout/1",
        createdAt: "2026-07-16T00:00:00.000Z",
      },
    ]);
    const lines = csv.replace(/^﻿/, "").trimEnd().split("\r\n");
    expect(lines[0]).toBe("Full name,Areas,Agree?,Source,Agent,Submitted at");
    expect(lines[1]).toBe('"Drew, Jr.",Climate; Policy,Yes,agent,scout/1,2026-07-16T00:00:00.000Z');
  });

  it("starts with a UTF-8 BOM for Excel", () => {
    const csv = buildResponsesCsv(fields, []);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("leaves missing answers blank", () => {
    const csv = buildResponsesCsv(fields, [
      { answers: { full_name: "Solo" }, source: "human", agentName: null, createdAt: "2026-07-16T00:00:00.000Z" },
    ]);
    const row = csv.replace(/^﻿/, "").trimEnd().split("\r\n")[1];
    expect(row).toBe("Solo,,,human,,2026-07-16T00:00:00.000Z");
  });
});

describe("exportFilename", () => {
  it("slugifies the form title", () => {
    expect(exportFilename("Rivera Foundation Scholarship 2026", "csv")).toBe(
      "rivera-foundation-scholarship-2026-responses.csv"
    );
  });
});
