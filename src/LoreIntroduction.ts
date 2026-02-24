// NOTE: Replace placeholder SVG images in /public/images/lore/ with AI-generated artwork.
// Use an AI image generator (e.g. Midjourney, DALL-E, Stable Diffusion) with the prompts
// provided as comments before each slide entry below. Recommended resolution: 1920×1080, 16:9.

interface LoreSlide {
    /** Path to the slide image (relative to /public). Replace with AI-generated artwork. */
    src: string;
    caption: string;
}

// Each image is shown for DISPLAY_DURATION ms at full opacity, with FADE_DURATION ms fades.
const DISPLAY_DURATION = 10000; // ms per slide at full opacity
const FADE_DURATION = 2000;     // ms for each fade in / fade out

const LORE_SLIDES: LoreSlide[] = [
    {
        // Image prompt: "Massive cyberpunk corporate skyscraper at night, neon glowing 'OMETEC' logo
        // on the facade, dense futuristic city skyline, dark blue and purple tones, rain, volumetric
        // lighting, cinematic wide establishing shot, photorealistic, 1920x1080"
        src: 'images/lore/lore_01.svg',
        caption: 'OMETEC CORPORATION — the world\'s largest digital infrastructure provider, managing 78% of global network traffic.',
    },
    {
        // Image prompt: "Abstract visualization of a malicious computer virus spreading through digital
        // networks, red corrupted data streams infecting glowing blue circuit board pathways, black
        // background, intricate cyberpunk detail, ominous atmosphere, 1920x1080"
        src: 'images/lore/lore_02.svg',
        caption: 'Designated VIRUS-ZERO: a self-replicating malware strain of unknown origin. It began consuming the network from within.',
    },
    {
        // Image prompt: "Large server room in chaos, server racks on fire with sparks and smoke,
        // emergency red lighting, screens displaying critical error messages and cascading failures,
        // cyberpunk industrial environment, dramatic wide angle shot, high contrast, 1920x1080"
        src: 'images/lore/lore_03.svg',
        caption: 'Critical systems began failing. Firewalls shattered. Data vaults were consumed one by one.',
    },
    {
        // Image prompt: "Futuristic emergency operations center, dozens of holographic screens showing
        // network maps with spreading red infection zones, technicians in crisis, tense atmosphere,
        // dark blue cyberpunk lighting, cinematic wide shot, 1920x1080"
        src: 'images/lore/lore_04.svg',
        caption: 'All standard countermeasures failed. The board authorized a last-resort measure: direct neural interfacing with the infected core.',
    },
    {
        // Image prompt: "Close-up of a technician's head with a glowing neural interface cable being
        // connected to a port at the base of the skull, blue bio-luminescent glow, dark clinical room,
        // cyberpunk medical technology, dramatic shallow depth of field, 1920x1080"
        src: 'images/lore/lore_05.svg',
        caption: 'Technician Unit 734 volunteered. A neural jack pierced the cortex interface. His mind would become the antivirus.',
    },
    {
        // Image prompt: "Abstract digital dimension, a human silhouette dissolving and reforming as
        // streams of glowing code and data particles, brilliant blue and white light against infinite
        // black void, consciousness merging with cyberspace, ethereal and dramatic, 1920x1080"
        src: 'images/lore/lore_06.svg',
        caption: 'Neural patterns translated into pure data. Consciousness bled into the machine — and within the digital realm, you were born.',
    },
    {
        // Image prompt: "Vast corrupted cyberspace dungeon, endless layers of dark digital architecture
        // stretching to the horizon, glowing red data conduits and broken code structures, dark purple
        // and crimson atmosphere, first-person perspective, epic scale, 1920x1080"
        src: 'images/lore/lore_07.svg',
        caption: 'The digital realm: a corrupted labyrinth of failing code. Multiple system layers — each darker and more dangerous than the last.',
    },
    {
        // Image prompt: "Ethereal AI entity manifesting as a glowing humanoid form made of blue light
        // and flowing code, floating in a dark digital void, reaching out toward the viewer,
        // oracle-like presence, warm blue radiance, hopeful yet mysterious cyberpunk aesthetic, 1920x1080"
        src: 'images/lore/lore_08.svg',
        caption: 'A signal cuts through the static. The Mainframe AI — the system\'s guardian — still lives. It will guide your path.',
    },
    {
        // Image prompt: "Army of dark digital creatures formed from corrupted red code and shadow,
        // menacing abstract forms emerging from darkness, glowing red eyes and jagged edges,
        // overwhelming numbers, cyberpunk horror aesthetic, oppressive atmosphere, 1920x1080"
        src: 'images/lore/lore_09.svg',
        caption: 'VIRUS-ZERO has spawned an army of malware entities. They devour everything — and they will not yield without a fight.',
    },
    {
        // Image prompt: "Lone glowing digital warrior standing before a massive corrupted digital
        // fortress, blue aura against crimson darkness, epic cinematic scale, determined stance,
        // the weight of a world's survival on their shoulders, cyberpunk, 1920x1080"
        src: 'images/lore/lore_10.svg',
        caption: 'Navigate the corrupted system layers. Eliminate the spreading malware. You are the last line of defense before total collapse.',
    },
];

/**
 * Manages the lore introduction slideshow shown after the start screen.
 * Shows a sequence of full-screen images with captions, fading in and out,
 * while each image slowly zooms from 100% to 105%.
 */
export class LoreIntroduction {
    private readonly overlay: HTMLDivElement;
    private readonly imageEl: HTMLImageElement;
    private readonly captionEl: HTMLDivElement;
    private readonly onComplete: () => void;
    private displayTimeoutId?: ReturnType<typeof setTimeout>;
    private transitionTimeoutId?: ReturnType<typeof setTimeout>;
    private currentSlideIndex: number = 0;
    private readonly clickHandler: () => void;

    constructor(onComplete: () => void) {
        this.onComplete = onComplete;

        // Full-screen black container — sits above the game canvas during the intro
        this.overlay = document.createElement('div');
        this.overlay.style.cssText = [
            'position:fixed',
            'top:0',
            'left:0',
            'width:100%',
            'height:100%',
            'background-color:#000',
            'z-index:1100',
            'overflow:hidden',
            'cursor:pointer',
        ].join(';');

        // Image element covering the full overlay; object-fit:cover preserves aspect ratio
        this.imageEl = document.createElement('img');
        this.imageEl.style.cssText = [
            'position:absolute',
            'top:0',
            'left:0',
            'width:100%',
            'height:100%',
            'object-fit:cover',
            'opacity:0',
            'will-change:transform,opacity',
            'pointer-events:none',
        ].join(';');

        // Caption bar — white text on 70% alpha black background, 42 px from the bottom
        this.captionEl = document.createElement('div');
        this.captionEl.style.cssText = [
            'position:absolute',
            'bottom:42px',
            'left:50%',
            'transform:translateX(-50%)',
            'max-width:80%',
            'color:#fff',
            'font-family:"Share Tech",sans-serif',
            'font-size:22px',
            'line-height:1.5',
            'background:rgba(0,0,0,0.7)',
            'padding:20px',
            'text-align:center',
            'opacity:0',
            'will-change:opacity',
            'z-index:1',
            'pointer-events:none',
        ].join(';');

        // Clicking or tapping anywhere on the overlay advances to the next slide
        this.clickHandler = () => this.advanceSlide();
        this.overlay.addEventListener('click', this.clickHandler);
        this.overlay.addEventListener('touchstart', this.clickHandler, { passive: true });

        this.overlay.appendChild(this.imageEl);
        this.overlay.appendChild(this.captionEl);
    }

    /** Appends the overlay to the DOM and starts the first slide. */
    show(): void {
        document.body.appendChild(this.overlay);
        this.showSlide(0);
    }

    /** Skips the current slide: fades it out, then advances to the next one (or completes the intro). */
    private advanceSlide(): void {
        // Cancel any existing timers so the automatic sequence doesn't also fire
        if (this.displayTimeoutId !== undefined) {
            clearTimeout(this.displayTimeoutId);
            this.displayTimeoutId = undefined;
        }
        if (this.transitionTimeoutId !== undefined) {
            clearTimeout(this.transitionTimeoutId);
            this.transitionTimeoutId = undefined;
        }

        // Fade out the current slide before advancing
        this.imageEl.style.transition = `opacity ${FADE_DURATION}ms ease-in-out`;
        this.imageEl.style.opacity = '0';
        this.captionEl.style.transition = `opacity ${FADE_DURATION}ms ease-in-out`;
        this.captionEl.style.opacity = '0';

        this.transitionTimeoutId = setTimeout(() => {
            this.transitionTimeoutId = undefined;
            const nextIndex = this.currentSlideIndex + 1;
            if (nextIndex >= LORE_SLIDES.length) {
                this.destroy();
                this.onComplete();
            } else {
                this.showSlide(nextIndex);
            }
        }, FADE_DURATION);
    }

    private showSlide(index: number): void {
        this.currentSlideIndex = index;
        const slide = LORE_SLIDES[index];
        const isLast = index === LORE_SLIDES.length - 1;

        // Reset to invisible without transition so the previous slide state is cleared
        this.imageEl.style.transition = 'none';
        this.imageEl.style.opacity = '0';
        this.imageEl.style.transform = 'scale(1)';
        this.captionEl.style.transition = 'none';
        this.captionEl.style.opacity = '0';

        this.imageEl.src = slide.src;
        this.captionEl.textContent = slide.caption;

        // Double rAF ensures the browser applies the transition:none before we start animating
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const totalVisibleMs = FADE_DURATION + DISPLAY_DURATION;

                // Fade in opacity over FADE_DURATION; zoom from 1.0 → 1.05 over the full visible time
                this.imageEl.style.transition = `opacity ${FADE_DURATION}ms ease-in-out, transform ${totalVisibleMs}ms linear`;
                this.imageEl.style.opacity = '1';
                this.imageEl.style.transform = 'scale(1.15)';

                this.captionEl.style.transition = `opacity ${FADE_DURATION}ms ease-in-out`;
                this.captionEl.style.opacity = '1';

                // Begin fade-out after the full visible duration has elapsed
                this.displayTimeoutId = setTimeout(() => {
                    this.imageEl.style.transition = `opacity ${FADE_DURATION}ms ease-in-out`;
                    this.imageEl.style.opacity = '0';
                    this.captionEl.style.transition = `opacity ${FADE_DURATION}ms ease-in-out`;
                    this.captionEl.style.opacity = '0';

                    this.transitionTimeoutId = setTimeout(() => {
                        if (isLast) {
                            this.destroy();
                            this.onComplete();
                        } else {
                            this.showSlide(index + 1);
                        }
                    }, FADE_DURATION);
                }, totalVisibleMs);
            });
        });
    }

    /** Cancels any pending timers and removes the overlay from the DOM. */
    destroy(): void {
        if (this.displayTimeoutId !== undefined) {
            clearTimeout(this.displayTimeoutId);
            this.displayTimeoutId = undefined;
        }
        if (this.transitionTimeoutId !== undefined) {
            clearTimeout(this.transitionTimeoutId);
            this.transitionTimeoutId = undefined;
        }
        this.overlay.removeEventListener('click', this.clickHandler);
        this.overlay.removeEventListener('touchstart', this.clickHandler);
        if (this.overlay.parentElement) {
            this.overlay.parentElement.removeChild(this.overlay);
        }
    }
}
