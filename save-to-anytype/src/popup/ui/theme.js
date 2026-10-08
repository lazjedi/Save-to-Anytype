import { applyThemeVariables } from '../../shared/theme-config.js';
import { elements } from '../core/dom.js';
import { state } from '../core/state.js';

// Applies the theme, accent color and the size settings to the popup
export function applyAppearance() {
    const themeConfig = applyThemeVariables(state.theme, state.accentColor);

    elements.colorInput.jscolor?.fromString(themeConfig.accentColor);

    elements.zoomRangeValue.value = state.zoom;
    elements.zoomCurrentRange.textContent = state.zoom;
    elements.zoomContainer.style.zoom = state.zoom;

    elements.heightRangeValue.value = state.height;
    elements.heightCurrentRange.textContent = state.height;

    elements.widthRangeValue.value = state.width;
    elements.widthCurrentRange.textContent = state.width;

    elements.textAreaHeightRangeValue.value = state.textAreaHeightPx;
    elements.textAreaHeightCurrentRange.textContent = state.textAreaHeightPx;
    document.documentElement.style.setProperty('--object-body-min-height', `${state.textAreaHeightPx}px`);
}
