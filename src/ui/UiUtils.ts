export function resetInputDebounce(target: { lastSelectState?: boolean; lastNavigateUpState?: boolean; lastNavigateDownState?: boolean; lastCancelState?: boolean; }) {
    if (typeof target.lastSelectState !== 'undefined') target.lastSelectState = true;
    if (typeof target.lastNavigateUpState !== 'undefined') target.lastNavigateUpState = true;
    if (typeof target.lastNavigateDownState !== 'undefined') target.lastNavigateDownState = true;
    if (typeof target.lastCancelState !== 'undefined') target.lastCancelState = true;
}

export function shakeElement(element: HTMLElement): void {
    const keyframes = [
        { transform: 'translateX(0px)' },
        { transform: 'translateX(-5px)' },
        { transform: 'translateX(5px)' },
        { transform: 'translateX(-5px)' },
        { transform: 'translateX(5px)' },
        { transform: 'translateX(0px)' }
    ];
    const timing = { duration: 300, iterations: 1 };
    try { 
        element.animate(keyframes, timing); 
    } catch (e) { 
        /* ignore if not supported */ 
    }
}
