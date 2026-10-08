import { t } from '../core/i18n.js';

// Shows a localized tooltip that follows the mouse while it is over the element
export function attachTooltip(element, textKey, xOffset = 10) {
    if (!element || element.dataset.tooltipAttached === 'true') return;
    element.dataset.tooltipAttached = 'true';

    let tooltip = null;

    const updatePosition = (event) => {
        if (!tooltip) return;
        tooltip.style.left = (event.clientX - xOffset) + "px";
        tooltip.style.top = (event.clientY + 30) + "px";
    };

    element.addEventListener("mouseenter", (event) => {
        tooltip?.remove();
        tooltip = document.createElement("div");
        tooltip.className = "custom-tooltip";
        tooltip.innerText = t(textKey);
        document.body.appendChild(tooltip);

        updatePosition(event);
        element.addEventListener("mousemove", updatePosition);

        setTimeout(() => {
            if (tooltip) tooltip.style.opacity = "1";
        }, 10);
    });

    element.addEventListener("mouseleave", () => {
        tooltip?.remove();
        tooltip = null;
        element.removeEventListener("mousemove", updatePosition);
    });
}

export function createTooltipButton(textKey, xOffset, className = "btn-file-name-top-tip") {
    const button = document.createElement("div");
    button.className = className;
    button.innerText = "?";
    attachTooltip(button, textKey, xOffset);
    return button;
}

// Tooltips declared in HTML: <div data-tooltip-key="FileNameTooltip" data-tooltip-offset="200">?</div>
export function attachTooltipsIn(root) {
    root.querySelectorAll('[data-tooltip-key]').forEach(element => {
        attachTooltip(element, element.dataset.tooltipKey, Number(element.dataset.tooltipOffset || 200));
    });
}
