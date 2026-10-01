import { FetchTransport, HandoffClient, HandoffError, type ApplicationAdapter, type JsonValue } from "@dermoptera/handoff";
import { createReplacePrompt, renderQrToCanvas } from "@dermoptera/handoff-ui";

interface QuoteState extends Record<string, JsonValue> {
  step: number;
  projectType: string;
  area: number | null;
  timing: string;
}

const STORAGE_KEY = "handoff-poc:quote:v1";
function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Sample markup is missing ${selector}.`);
  return element;
}
const form = requiredElement<HTMLFormElement>("#wizard");
const status = requiredElement<HTMLElement>("#status");
const CONFIG_KEY = "handoff-poc:publishable-key";
const parameters = new URLSearchParams(location.search);
const queryKey = parameters.get("key");
if (queryKey?.startsWith("pk_")) localStorage.setItem(CONFIG_KEY, queryKey);
const publishableKey = queryKey ?? localStorage.getItem(CONFIG_KEY) ?? document.documentElement.dataset.publishableKey ?? "pk_local_configure_me";
const endpoint = parameters.get("endpoint") ?? document.documentElement.dataset.endpoint ?? "http://127.0.0.1:8797";
const transport = new FetchTransport({ endpoint, publishableKey });
const handoff = new HandoffClient({ appId: "quote-wizard-demo", schemaVersion: "v1", transport });

function isQuoteState(value: JsonValue): value is QuoteState {
  if (!value || Array.isArray(value) || typeof value !== "object") return false;
  const object = value as Record<string, JsonValue>;
  return Object.keys(object).every((key) => ["step", "projectType", "area", "timing"].includes(key)) &&
    Number.isInteger(object.step) && Number(object.step) >= 1 && Number(object.step) <= 4 &&
    typeof object.projectType === "string" && object.projectType.length <= 40 &&
    (object.area === null || (typeof object.area === "number" && Number.isFinite(object.area) && object.area >= 1 && object.area <= 500)) &&
    typeof object.timing === "string" && object.timing.length <= 40;
}

function readState(): QuoteState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const value = JSON.parse(raw) as JsonValue;
      if (isQuoteState(value)) return value;
    }
  } catch { /* display a clean default; never overwrite the malformed value automatically */ }
  return { step: 1, projectType: "", area: null, timing: "" };
}

let state = readState();
function writeState(value: QuoteState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch (cause) {
    throw new HandoffError("STORAGE_UNAVAILABLE", "Browser storage is unavailable or full.", { cause });
  }
}
function save(): void { writeState(state); }
function draw(): void {
  form.querySelectorAll<HTMLElement>("[data-step]").forEach((section) => { section.hidden = Number(section.dataset.step) !== state.step; });
  const project = form.elements.namedItem("projectType") as HTMLSelectElement;
  const area = form.elements.namedItem("area") as HTMLInputElement;
  const timing = form.elements.namedItem("timing") as HTMLSelectElement;
  project.value = state.projectType;
  area.value = state.area === null ? "" : String(state.area);
  timing.value = state.timing;
  const review = document.querySelector<HTMLElement>("#review");
  if (review) review.textContent = JSON.stringify(state, null, 2);
}
function capture(): void {
  const data = new FormData(form);
  state = {
    step: state.step,
    projectType: String(data.get("projectType") ?? ""),
    area: data.get("area") ? Number(data.get("area")) : null,
    timing: String(data.get("timing") ?? ""),
  };
  save();
}

const adapter: ApplicationAdapter<QuoteState> = {
  exportState: () => { capture(); return state; },
  validateIncomingState: isQuoteState,
  hasExistingState: () => {
    try { return Boolean(localStorage.getItem(STORAGE_KEY)); }
    catch (cause) { throw new HandoffError("STORAGE_UNAVAILABLE", "Browser storage is unavailable.", { cause }); }
  },
  confirmReplace: createReplacePrompt("This browser already has quote progress. Replace it with the transferred progress?"),
  importState: (incoming) => { writeState(incoming); state = incoming; },
  resume: () => { draw(); status.textContent = `Resumed at step ${state.step}.`; },
};

document.querySelector("#next")?.addEventListener("click", () => { capture(); state.step = Math.min(4, state.step + 1); save(); draw(); });
document.querySelector("#back")?.addEventListener("click", () => { capture(); state.step = Math.max(1, state.step - 1); save(); draw(); });
document.querySelector("#clear")?.addEventListener("click", () => { localStorage.removeItem(STORAGE_KEY); state = readState(); draw(); status.textContent = "Sample state cleared."; });
document.querySelector("#create")?.addEventListener("click", () => {
  void (async () => {
    try {
      const transfer = await handoff.createFromAdapter(adapter, { ttl: 600, continueUrl: location.origin + location.pathname });
      const canvas = document.querySelector<HTMLCanvasElement>("#qr");
      const panel = document.querySelector<HTMLElement>("#qr-panel");
      const link = document.querySelector<HTMLAnchorElement>("#claim-link");
      if (!canvas || !panel || !link) throw new Error("QR markup missing.");
      await renderQrToCanvas(canvas, transfer.url);
      panel.hidden = false;
      link.href = transfer.url;
      document.querySelector<HTMLElement>("#expires")!.textContent = `Expires at ${new Date(transfer.expiresAt * 1000).toLocaleTimeString()}.`;
      status.textContent = "Encrypted state created. The key exists only in the QR link fragment.";
    } catch (error) { status.textContent = error instanceof HandoffError ? `${error.code}: ${error.message}` : "Could not create the transfer."; }
  })();
});

draw();
if (location.hash.startsWith("#hfx1.")) {
  void handoff.claimAndResume({ adapter }).catch((error: unknown) => {
    status.textContent = error instanceof HandoffError ? `${error.code}: ${error.message}` : "Could not resume the quote.";
  });
}
