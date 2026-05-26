import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { transitionalNavigate } from "@/lib/view-transitions";

describe("transitionalNavigate", () => {
  const originalDocument = globalThis.document;

  afterEach(() => {
    if (originalDocument !== undefined) {
      (globalThis as { document?: Document }).document = originalDocument;
    } else {
      delete (globalThis as unknown as { document?: Document }).document;
    }
  });

  it("calls router.push when startViewTransition is unavailable", () => {
    (globalThis as unknown as { document?: { startViewTransition?: unknown } }).document = {};
    const push = vi.fn();
    const replace = vi.fn();
    transitionalNavigate({ push, replace }, "/somewhere");
    expect(push).toHaveBeenCalledWith("/somewhere");
    expect(replace).not.toHaveBeenCalled();
  });

  it("calls router.replace when method='replace' and VT unavailable", () => {
    (globalThis as unknown as { document?: { startViewTransition?: unknown } }).document = {};
    const push = vi.fn();
    const replace = vi.fn();
    transitionalNavigate({ push, replace }, "/elsewhere", "replace");
    expect(replace).toHaveBeenCalledWith("/elsewhere");
    expect(push).not.toHaveBeenCalled();
  });

  it("wraps the navigation in startViewTransition when available", () => {
    const startViewTransition = vi.fn((cb: () => void) => {
      cb();
      return {} as unknown;
    });
    (globalThis as unknown as { document?: { startViewTransition?: typeof startViewTransition } }).document = {
      startViewTransition,
    };
    const push = vi.fn();
    const replace = vi.fn();
    transitionalNavigate({ push, replace }, "/with-vt");
    expect(startViewTransition).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledWith("/with-vt");
  });

  it("no-ops cleanly with no document (e.g. SSR)", () => {
    delete (globalThis as unknown as { document?: Document }).document;
    const push = vi.fn();
    const replace = vi.fn();
    transitionalNavigate({ push, replace }, "/ssr");
    expect(push).toHaveBeenCalledWith("/ssr");
  });
});
