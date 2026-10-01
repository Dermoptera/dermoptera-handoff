# @dermoptera/handoff-ui

Optional browser UI helpers for `@dermoptera/handoff`: render a continuation URL
as a QR code and create an explicit replace-or-cancel prompt. The core SDK does
not depend on this package.

```bash
npm install @dermoptera/handoff @dermoptera/handoff-ui
```

```ts
import { renderQrToCanvas, createReplacePrompt } from "@dermoptera/handoff-ui";

await renderQrToCanvas(document.querySelector("canvas")!, transfer.url);
const confirmReplace = createReplacePrompt();
```

License: MIT. See `THIRD_PARTY_NOTICES.md` for the QR dependency notices.
