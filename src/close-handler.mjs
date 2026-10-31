import { t } from './i18n.js';
// Tauri awaits this handler, then destroys the window unless closing was prevented.
export function createCloseHandler({ getState, ask, report }) {
  let pending = false;
  return async (event) => {
    if (pending) { event.preventDefault(); return; }
    if (getState()?.busy) {
      event.preventDefault();
      report(new Error(t("Please wait for the current operation to finish before closing.")));
      return;
    }
    if (!getState()?.dirty) return;
    pending = true;
    try {
      if (!await ask(t("Unsaved changes"), t("Close the editor and discard your unsaved changes?"), t("Close editor"))) event.preventDefault();
    } catch (error) {
      event.preventDefault();
      report(error);
    } finally { pending = false; }
  };
}
