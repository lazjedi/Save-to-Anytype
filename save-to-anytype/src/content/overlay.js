// The popup (src/popup/popup.html) shown as an iframe on top of the page

(() => {
    const ns = (globalThis.__saveToAnytype ??= {});
    if (ns.overlay) return; // already injected

    const OVERLAY_ID = "save-to-anytype-overlay";
    const DEFAULT_HEIGHT_PERCENT = 70;
    const DEFAULT_WIDTH_PERCENT = 24;

    let removeOutsideClickListener = null;

    function getOverlay() {
        return document.getElementById(OVERLAY_ID);
    }

    function close() {
        getOverlay()?.remove();

        if (removeOutsideClickListener) {
            removeOutsideClickListener();
            removeOutsideClickListener = null;
        }
    }

    function open() {
        if (getOverlay()) return;

        const overlay = document.createElement("iframe");
        overlay.id = OVERLAY_ID;
        Object.assign(overlay.style, {
            position: "fixed",
            top: "10px",
            right: "10px",
            zIndex: "999999",
            width: `${DEFAULT_WIDTH_PERCENT}%`,
            minWidth: "340px",
            height: `${DEFAULT_HEIGHT_PERCENT}%`,
            border: "2px solid #000",
            borderRadius: "11px"
        });
        overlay.src = chrome.runtime.getURL("src/popup/popup.html");

        document.body.appendChild(overlay);

        const onClickOutside = (event) => {
            if (!overlay.contains(event.target)) close();
        };
        document.addEventListener("mousedown", onClickOutside);
        removeOutsideClickListener = () => document.removeEventListener("mousedown", onClickOutside);

        applySavedSize(overlay);
    }

    function toggle() {
        if (getOverlay()) close();
        else open();
    }

    async function applySavedSize(overlay) {
        const saved = await chrome.storage.local.get(["height", "width"]);

        overlay.style.height = `${saved.height || DEFAULT_HEIGHT_PERCENT}%`;
        overlay.style.width = `${saved.width || DEFAULT_WIDTH_PERCENT}%`;
    }

    ns.overlay = { OVERLAY_ID, getOverlay, open, close, toggle };
})();
