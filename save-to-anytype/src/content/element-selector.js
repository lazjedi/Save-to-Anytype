// Element selection mode: the user picks an element on the page, its class and DOM path are sent to the popup.
// Later the text of this element is read by GetElementByClassNameAndDOM

(() => {
    const ns = (globalThis.__saveToAnytype ??= {});
    if (ns.elementSelector) return; // already injected

    const HIGHLIGHT_CLASS = "page-element-selector-highlight";
    const ACTIVE_BODY_CLASS = "page-element-selector-active";

    let tooltip = null;
    let hiddenOverlay = null;
    let active = false;
    let lastElement = null;
    let localization = {};
    let stylesInjected = false;

    function injectStyles() {
        if (stylesInjected) return;
        stylesInjected = true;

        const style = document.createElement("style");
        style.textContent = `
            .${HIGHLIGHT_CLASS} {
                outline: 3px solid #ff3030 !important;
                background-color: rgba(255, 48, 48, 0.1) !important;
            }
            body.${ACTIVE_BODY_CLASS}, body.${ACTIVE_BODY_CLASS} * {
                cursor: crosshair !important;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    // className is an SVGAnimatedString for svg elements, so read the attribute
    function getElementClass(element) {
        const classes = String(element?.getAttribute?.("class") || "")
            .split(/\s+/)
            .filter(c => c && c !== HIGHLIGHT_CLASS);

        return classes.join(" ");
    }

    function start(newLocalization) {
        localization = newLocalization || localization;
        injectStyles();
        active = true;

        // Hide the overlay while selecting
        const overlay = ns.overlay?.getOverlay();
        if (overlay) {
            overlay.style.display = "none";
            hiddenOverlay = overlay;
        }

        document.body.classList.add(ACTIVE_BODY_CLASS);

        document.addEventListener("mouseover", handleHover);
        document.addEventListener("mouseout", handleMouseOut);
        document.addEventListener("click", handleClick, true);
        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("mousedown", preventPageInteraction, true);
        document.addEventListener("mouseup", preventPageInteraction, true);
    }

    function stop() {
        active = false;
        document.body.classList.remove(ACTIVE_BODY_CLASS);

        document.removeEventListener("mouseover", handleHover);
        document.removeEventListener("mouseout", handleMouseOut);
        document.removeEventListener("click", handleClick, true);
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("mousedown", preventPageInteraction, true);
        document.removeEventListener("mouseup", preventPageInteraction, true);

        removeTooltip();

        if (hiddenOverlay) {
            hiddenOverlay.style.display = "block";
            hiddenOverlay = null;
        }

        if (lastElement) {
            lastElement.classList.remove(HIGHLIGHT_CLASS);
            lastElement = null;
        }
    }

    function handleHover(event) {
        if (!active) return;

        const element = event.target;

        if (lastElement && lastElement !== element)
            lastElement.classList.remove(HIGHLIGHT_CLASS);

        element.classList.add(HIGHLIGHT_CLASS);
        lastElement = element;

        showTooltip(event, element);
    }

    function handleMouseOut(event) {
        if (!active) return;

        event.target.classList.remove(HIGHLIGHT_CLASS);
        removeTooltip();
    }

    function handleClick(event) {
        if (!active) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const element = event.target;

        chrome.runtime.sendMessage({
            action: "ELEMENT_SELECTED",
            elementClass: getElementClass(element) || "no-class",
            elementText: (element.textContent || "").substring(0, 100).trim(),
            elementDOM: getElementDomPath(element)
        }).catch(error => console.error("Error sending element selection:", error));

        stop();
    }

    function handleKeyDown(event) {
        if (event.key === "Escape" && active) stop();
    }

    function preventPageInteraction(event) {
        if (!active) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    }

    function removeTooltip() {
        tooltip?.remove();
        tooltip = null;
    }

    function showTooltip(event, element) {
        removeTooltip();

        const elementClass = getElementClass(element);
        if (!elementClass) return;

        tooltip = document.createElement("div");
        tooltip.style.cssText = `
            position: fixed;
            background: #2a2a2a;
            color: #e8e8e8;
            padding: 2px 5px;
            border-radius: 7px;
            font-size: 13px;
            border: 1px solid #4e4e4e;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            z-index: 9999999;
            max-width: 280px;
            word-wrap: break-word;
            pointer-events: none;
            left: ${event.clientX + 10}px;
            top: ${event.clientY + 10}px;
        `;

        // Page content is put with textContent, never as HTML
        const classLine = document.createElement("div");
        classLine.style.cssText = "color: #b0b0b0; margin-bottom: 4px;";
        const classLabel = document.createElement("strong");
        classLabel.textContent = localization.class || "Selected class:";
        classLine.append(classLabel, " " + elementClass);

        const textLine = document.createElement("div");
        textLine.style.cssText = "color: #e8e8e8; font-size: 16px;";
        const textLabel = document.createElement("strong");
        textLabel.textContent = (localization.text || "Text") + ":";
        textLine.append(textLabel, " " + (element.textContent || "").substring(0, 50).trim().replace(/\n/g, " "));

        tooltip.append(classLine, textLine);
        document.body.appendChild(tooltip);
    }

    //#region Finding the selected element later

    // classNameAndDom: "<classes>|<dom path>"
    function getElementText(classNameAndDom) {
        const raw = String(classNameAndDom || "").trim();
        if (!raw) return "";

        const separatorIndex = raw.indexOf("|");
        const className = separatorIndex === -1 ? raw : raw.slice(0, separatorIndex);
        const domPath = separatorIndex === -1 ? "" : raw.slice(separatorIndex + 1).trim();

        const classNames = String(className || "")
            .split(/\s+/)
            .filter(token => token && token !== HIGHLIGHT_CLASS && token !== "no-class");

        let elementByPath = null;
        if (domPath) {
            try {
                elementByPath = document.querySelector(domPath);
            } catch {
                elementByPath = null;
            }
        }

        // The same place in the DOM with the same classes - exactly the selected element.
        // Otherwise the page layout differs (another page of the site): search by class, then take the element at the path
        const pathMatchesClasses = elementByPath && classNames.every(name => elementByPath.classList.contains(name));
        const foundElement = pathMatchesClasses
            ? elementByPath
            : findElementByClassList(classNames) ?? elementByPath;

        return foundElement ? String(foundElement.innerText || "").trim() : "";
    }

    function findElementByClassList(classNames) {
        const classTokens = classNames.map(token => CSS.escape(token));

        if (!classTokens.length) return null;

        const selectors = ["." + classTokens.join("."), ...classTokens.map(token => "." + token)];

        for (const selector of selectors) {
            try {
                const element = document.querySelector(selector);
                if (element) return element;
            } catch {
                // invalid selector - try the next one
            }
        }

        return null;
    }

    function getElementDomPath(element) {
        if (!(element instanceof Element)) return "";
        if (element.id) return "#" + CSS.escape(element.id);

        const path = [];
        let current = element;

        while (current && current.nodeType === Node.ELEMENT_NODE) {
            const tagName = current.nodeName.toLowerCase();
            if (tagName === "html") {
                path.unshift("html");
                break;
            }

            if (current.id) {
                path.unshift("#" + CSS.escape(current.id));
                break;
            }

            let selectorPart = tagName;
            const parent = current.parentElement;

            if (parent) {
                const sameTagSiblings = Array.from(parent.children).filter(child => child.nodeName.toLowerCase() === tagName);
                if (sameTagSiblings.length > 1)
                    selectorPart += `:nth-of-type(${sameTagSiblings.indexOf(current) + 1})`;
            }

            path.unshift(selectorPart);
            current = parent;
        }

        return path.join(" > ");
    }

    //#endregion

    ns.elementSelector = { start, stop, getElementText };
})();
