---
name: blank-screen-fragility
description: Frontend has no error boundary and a hardcoded 'aaryan' current-user id — a throw in any always-mounted component blanks the whole app
metadata:
  type: project
---

The internal_tool-ui frontend has **no React error boundary**, so a throw in any always-mounted component (e.g. `Layout`/`Sidebar`) unmounts the entire tree → blank `#root`, no visible message.

Since the MongoDB switch, `DataContext` no longer seeds mock data — collections are **empty on first render** until the API resolves. Code that assumes data exists on first render crashes. Concrete case fixed: `Sidebar.tsx` did `const aaryan = usersById['aaryan']` then `aaryan.name` (undefined on first render). The current-user id `'aaryan'` is **hardcoded** across screens (`Sidebar.tsx`, `MyWork.tsx`) rather than a single `currentUser` value.

**Why:** these two facts turn any data-shape/id change into a silent full-page blank that's hard to diagnose from the UI alone.

**How to apply:** when the screen goes blank, capture the real error with headless Chrome — `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --dump-dom --enable-logging=stderr --v=1 http://localhost:5173/` and grep the log for `Uncaught`. Guard any `usersById[...]` / lookup access for the empty-first-render case. Consider adding an error boundary and a single `currentUser` source.
