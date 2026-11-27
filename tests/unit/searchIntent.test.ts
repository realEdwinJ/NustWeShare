import { describe, it, expect } from "vitest";
import { parseSearchIntent, moduleHref } from "@/lib/searchIntent";

describe("search intent", () => {
  it("splits code, year, type, number and semester", () => {
    expect(parseSearchIntent("MCI511S 2024")).toMatchObject({ code: "MCI511S", year: 2024, rest: "" });
    expect(parseSearchIntent("mci511s exam")).toMatchObject({ code: "MCI511S", type: "EXAM" });
    expect(parseSearchIntent("maths test 2 2023 s1")).toMatchObject({ type: "TEST", number: 2, year: 2023, semester: 1, rest: "maths" });
    expect(parseSearchIntent("Data Structures supp")).toMatchObject({ type: "SUPPLEMENTARY", rest: "Data Structures" });
    expect(parseSearchIntent("ELC511S quiz1 sem 2")).toMatchObject({ code: "ELC511S", type: "QUIZ", number: 1, semester: 2 });
    expect(parseSearchIntent("Electronic Devices")).toEqual({ rest: "Electronic Devices" });
  });
  it("builds filtered module links", () => {
    expect(moduleHref("MCI511S", { year: 2024, type: "EXAM" })).toBe("/modules/mci511s?year=2024&type=EXAM");
    expect(moduleHref("MCI511S")).toBe("/modules/mci511s");
  });
});
