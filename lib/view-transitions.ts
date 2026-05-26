// Tiny wrapper around the browser-native View Transitions API that gracefully
// degrades when unsupported (Firefox / older Safari) by just running the
// navigation directly. Keeps callers identical at the use-site: pass the
// router + URL + method, get a transition where the browser supports it and
// an instant nav where it doesn't.

type RouterLike = {
  push: (href: string) => void;
  replace: (href: string) => void;
};

type Method = "push" | "replace";

type DocumentWithVT = Document & {
  startViewTransition?: (cb: () => void | Promise<void>) => unknown;
};

export function transitionalNavigate(
  router: RouterLike,
  href: string,
  method: Method = "push",
): void {
  const nav = () => {
    if (method === "replace") router.replace(href);
    else router.push(href);
  };

  if (typeof document === "undefined") {
    nav();
    return;
  }

  const doc = document as DocumentWithVT;
  if (typeof doc.startViewTransition === "function") {
    doc.startViewTransition(nav);
    return;
  }
  nav();
}
