---
name: tailwind-input-style-override
description: Tailwind text-size classes may not apply to certain inputs — use inline style as fallback
metadata:
  type: feedback
---

When Tailwind `text-*` classes don't apply to an input element (e.g. the amount input in the expense drawer), use an inline `style={{ fontSize: N }}` instead of fighting with utility classes.

**Why:** In this project, the amount input in add-expense-drawer.tsx had Tailwind font-size classes that were not taking effect. The user fixed it with a simple inline style and was frustrated that the issue wasn't caught.

**How to apply:** When styling input elements and font-size isn't working via Tailwind classes, check if an inline style is needed. Don't assume Tailwind classes always win — verify visually or use inline styles as a reliable fallback.
