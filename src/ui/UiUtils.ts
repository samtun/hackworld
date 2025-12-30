export function resetInputDebounce(target: { lastSelectState?: boolean; lastNavigateUpState?: boolean; lastNavigateDownState?: boolean; lastCancelState?: boolean; }) {
    if (typeof target.lastSelectState !== 'undefined') target.lastSelectState = true;
    if (typeof target.lastNavigateUpState !== 'undefined') target.lastNavigateUpState = true;
    if (typeof target.lastNavigateDownState !== 'undefined') target.lastNavigateDownState = true;
    if (typeof target.lastCancelState !== 'undefined') target.lastCancelState = true;
}
