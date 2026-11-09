import { describe, expect, test } from "bun:test";
import { AsyncOperationOwner } from "../../src/internal/async-operation-owner.js";

describe("AsyncOperationOwner", () => {
  test("invalidates generations and releases resources once in reverse order", () => {
    const owner = new AsyncOperationOwner();
    const first = owner.begin();
    const cleanups: string[] = [];
    const firstResource = first.own(() => cleanups.push("first"));
    first.own(() => cleanups.push("second"));

    const second = owner.begin();
    expect(first.isCurrent()).toBe(false);
    expect(second.isCurrent()).toBe(true);
    expect(cleanups).toEqual(["second", "first"]);

    firstResource.dispose();
    owner.dispose();
    owner.dispose();
    expect(cleanups).toEqual(["second", "first"]);
  });

  test("terminal disposal immediately releases late resources", () => {
    const owner = new AsyncOperationOwner();
    const operation = owner.begin();
    owner.dispose();

    let releases = 0;
    operation.own(() => {
      releases += 1;
    });

    expect(operation.isCurrent()).toBe(false);
    expect(releases).toBe(1);
  });
});
