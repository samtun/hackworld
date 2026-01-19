import { Player } from '../Player';

export class UIManager {
    private static instance: UIManager; // Singleton

    container: HTMLDivElement;
    hpPath: SVGPathElement;
    tpPath: SVGPathElement;
    tpTrack: SVGPathElement;
    hpText: HTMLDivElement;
    tpText: HTMLDivElement;
    interactionHint: HTMLDivElement;
    controlHints: HTMLDivElement; // Centralized control hints display
    startScreen: HTMLDivElement;
    fadeOverlay: HTMLDivElement;
    loadingScreen: HTMLDivElement;
    progressBarFill: HTMLDivElement;
    deathOverlay: HTMLDivElement;
    private retryCallback?: () => void;
    private lobbyCallback?: () => void;
    private retryButton?: HTMLButtonElement;
    private lobbyButton?: HTMLButtonElement;
    private deathOverlaySelectedIndex: number = 0; // 0 = Retry, 1 = Return to Lobby
    private startScreenTapHandler?: (e: TouchEvent) => void;

    public startScreenTapped: boolean = false;
    private tpWarningTimer: number = 0.0
    private readonly TP_WARNING_DURATION: number = 1.0;
    private readonly TP_TRACK_COLOR = "#000055";
    private readonly TP_TRACK_FLASH_COLOR = "#AAAADD";

    private constructor() {
        this.startScreen = document.getElementById('start-screen') as HTMLDivElement;
        this.fadeOverlay = document.getElementById('fade-overlay') as HTMLDivElement;
        this.loadingScreen = document.getElementById('loading-screen') as HTMLDivElement;
        this.progressBarFill = document.getElementById('progress-bar-fill') as HTMLDivElement;

        // Add touch handler for start screen
        this.startScreenTapHandler = (e: TouchEvent) => {
            e.preventDefault();
            e.stopPropagation();
            this.startScreenTapped = true;
            console.log('Start screen tapped!'); // Debug log
        };
        if (this.startScreen) {
            this.startScreen.addEventListener('touchstart', this.startScreenTapHandler, { passive: false });
            // Also add click for fallback
            this.startScreen.addEventListener('click', () => {
                this.startScreenTapped = true;
                console.log('Start screen clicked!'); // Debug log
            });
        }

        // Set version text
        const versionBox = document.getElementById('version-box');
        if (versionBox) {
            versionBox.textContent = `v${__APP_VERSION__}`;
        }

        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.bottom = '30px';
        this.container.style.left = '30px';
        this.container.style.width = '120px';
        this.container.style.height = '120px';
        this.container.style.pointerEvents = 'none';
        this.container.style.fontFamily = '"Share Tech", Arial, sans-serif';
        this.container.style.fontWeight = 'bold';
        this.container.style.overflow = 'visible';
        document.body.appendChild(this.container);

        // SVG Container for Rings
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "120");
        svg.setAttribute("height", "120");
        svg.style.position = "absolute";
        svg.style.top = "0";
        svg.style.left = "0";
        this.container.appendChild(svg);


        const characterProfile = document.createElement("div");
        characterProfile.id = 'character-profile';
        characterProfile.style.backgroundImage = 'url(./images/character_portrait.png)';
        characterProfile.style.width = '80px';
        characterProfile.style.height = '80px';
        characterProfile.style.position = 'absolute';
        characterProfile.style.top = '50%';
        characterProfile.style.left = '50%';
        characterProfile.style.transform = 'translate(-50%, -50%)';
        characterProfile.style.backgroundSize = 'cover';
        characterProfile.style.backgroundPosition = 'center';
        characterProfile.style.backgroundRepeat = 'no-repeat';
        characterProfile.style.borderRadius = '50%';
        this.container.appendChild(characterProfile);

        // Background Circle
        const bgCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        bgCircle.setAttribute("cx", "60");
        bgCircle.setAttribute("cy", "60");
        bgCircle.setAttribute("r", "56");
        bgCircle.setAttribute("fill", "rgb(38, 31, 44)");
        bgCircle.setAttribute("stroke", "rgba(38, 31, 44, 0.44)");
        bgCircle.setAttribute("stroke-width", "4");
        svg.appendChild(bgCircle);

        // Portrait background Circle
        const portraitBgCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        portraitBgCircle.setAttribute("cx", "60");
        portraitBgCircle.setAttribute("cy", "60");
        portraitBgCircle.setAttribute("r", "40");
        portraitBgCircle.setAttribute("fill", "rgb(48, 35, 57)");
        portraitBgCircle.setAttribute("stroke", "rgb(104, 104, 152)");
        portraitBgCircle.setAttribute("stroke-width", "2");
        svg.appendChild(portraitBgCircle);

        // Angles for gaps (in radians)
        const gap = 0.6; // ~35 degrees gap at top and bottom
        const rotationOffset = -20 * (Math.PI / 180); // -20 degrees rotation

        // HP Ring (Right - Red)
        // Background Track
        const hpTrack = document.createElementNS("http://www.w3.org/2000/svg", "path");
        hpTrack.setAttribute("fill", "none");
        hpTrack.setAttribute("stroke", "#550000");
        hpTrack.setAttribute("stroke-width", "14");
        hpTrack.setAttribute("stroke-linecap", "square");
        this.setArc(hpTrack, 60, 60, 48, -Math.PI / 2 + gap + rotationOffset, Math.PI / 2 - gap + rotationOffset, 1, false);
        svg.appendChild(hpTrack);

        this.hpPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.hpPath.setAttribute("fill", "none");
        this.hpPath.setAttribute("stroke", "#CC2222");
        this.hpPath.setAttribute("stroke-width", "14");
        this.hpPath.setAttribute("stroke-linecap", "square");
        svg.appendChild(this.hpPath);

        // TP Ring (Left - Blue)
        // Background Track
        this.tpTrack = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.tpTrack.setAttribute("fill", "none");
        this.tpTrack.setAttribute("stroke", "#000055");
        this.tpTrack.setAttribute("stroke-width", "14");
        this.tpTrack.setAttribute("stroke-linecap", "square");
        this.setArc(this.tpTrack, 60, 60, 48, -Math.PI / 2 - gap + rotationOffset, -Math.PI * 1.5 + gap + rotationOffset, 1, true);
        svg.appendChild(this.tpTrack);

        this.tpPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.tpPath.setAttribute("fill", "none");
        this.tpPath.setAttribute("stroke", "#3333BB");
        this.tpPath.setAttribute("stroke-width", "14");
        this.tpPath.setAttribute("stroke-linecap", "square");
        svg.appendChild(this.tpPath);

        // Text Elements
        this.hpText = document.createElement('div');
        this.hpText.style.position = 'absolute';
        this.hpText.style.left = '125px'; // Moved further right (was 110)
        this.hpText.style.top = '65px';
        this.hpText.style.color = '#97cb92';
        this.hpText.style.fontSize = '24px';
        this.hpText.style.textShadow = '2px 2px 0px #000';
        this.container.appendChild(this.hpText);

        this.tpText = document.createElement('div');
        this.tpText.style.position = 'absolute';
        this.tpText.style.left = '105px'; // Moved further right (was 90)
        this.tpText.style.top = '95px';
        this.tpText.style.color = '#9a7ae9';
        this.tpText.style.fontSize = '20px';
        this.tpText.style.textShadow = '2px 2px 0px #000';
        this.container.appendChild(this.tpText);

        // Interaction Hint
        this.interactionHint = document.createElement('div');
        this.interactionHint.style.position = 'fixed';
        this.interactionHint.style.bottom = '100px';
        this.interactionHint.style.left = '50%';
        this.interactionHint.style.transform = 'translateX(-50%)';
        this.interactionHint.style.color = '#fff';
        this.interactionHint.style.fontSize = '20px';
        this.interactionHint.style.fontFamily = '"Share Tech", Arial, sans-serif';
        this.interactionHint.style.textShadow = '2px 2px 0px #000';
        this.interactionHint.style.display = 'none';
        this.interactionHint.innerText = '[ENTER] / (A) Interact';
        document.body.appendChild(this.interactionHint);

        // Centralized Control Hints (for menus)
        this.controlHints = document.createElement('div');
        this.controlHints.style.position = 'fixed';
        this.controlHints.style.bottom = '20px';
        this.controlHints.style.left = '50%';
        this.controlHints.style.transform = 'translateX(-50%)';
        this.controlHints.style.color = '#fff';
        this.controlHints.style.fontSize = '16px';
        this.controlHints.style.fontFamily = '"Share Tech", Arial, sans-serif';
        this.controlHints.style.textShadow = '2px 2px 0px #000';
        this.controlHints.style.display = 'none';
        this.controlHints.style.zIndex = '1100'; // Above menus (1000)
        this.controlHints.style.textAlign = 'center';
        this.controlHints.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        this.controlHints.style.padding = '10px 20px';
        this.controlHints.style.borderRadius = '5px';
        document.body.appendChild(this.controlHints);

        // Death Overlay
        this.deathOverlay = document.createElement('div');
        this.deathOverlay.style.position = 'fixed';
        this.deathOverlay.style.top = '0';
        this.deathOverlay.style.left = '0';
        this.deathOverlay.style.width = '100%';
        this.deathOverlay.style.height = '100%';
        this.deathOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.deathOverlay.style.display = 'none';
        this.deathOverlay.style.zIndex = '1500';
        this.deathOverlay.style.opacity = '0';
        this.deathOverlay.style.transition = 'opacity 1s ease-in-out';
        this.deathOverlay.style.flexDirection = 'column';
        this.deathOverlay.style.justifyContent = 'center';
        this.deathOverlay.style.alignItems = 'center';
        this.deathOverlay.style.fontFamily = '"Share Tech", Arial, sans-serif';

        // "Compilation failed" text
        const deathText = document.createElement('div');
        deathText.style.fontSize = '72px';
        deathText.style.fontWeight = 'bold';
        deathText.style.color = '#8B0000'; // Dark red
        deathText.style.marginBottom = '50px';
        deathText.style.textShadow = '4px 4px 8px rgba(0, 0, 0, 0.8)';
        deathText.textContent = 'Compilation failed';
        this.deathOverlay.appendChild(deathText);

        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '30px';

        // Retry button
        this.retryButton = document.createElement('button');
        this.retryButton.textContent = 'Retry';
        this.retryButton.style.padding = '15px 40px';
        this.retryButton.style.fontSize = '28px';
        this.retryButton.style.fontFamily = '"Share Tech", Arial, sans-serif';
        this.retryButton.style.fontWeight = 'bold';
        this.retryButton.style.color = '#fff';
        this.retryButton.style.backgroundColor = '#444';
        this.retryButton.style.border = '3px solid #fff';
        this.retryButton.style.borderRadius = '8px';
        this.retryButton.style.cursor = 'pointer';
        this.retryButton.style.transition = 'all 0.2s';
        this.retryButton.onmouseover = () => {
            this.deathOverlaySelectedIndex = 0;
            this.updateDeathOverlaySelection();
        };
        this.retryButton.onclick = () => {
            if (this.retryCallback) {
                this.retryCallback();
            }
        };
        buttonContainer.appendChild(this.retryButton);

        // Return to Lobby button
        this.lobbyButton = document.createElement('button');
        this.lobbyButton.textContent = 'Return to Lobby';
        this.lobbyButton.style.padding = '15px 40px';
        this.lobbyButton.style.fontSize = '28px';
        this.lobbyButton.style.fontFamily = '"Share Tech", Arial, sans-serif';
        this.lobbyButton.style.fontWeight = 'bold';
        this.lobbyButton.style.color = '#fff';
        this.lobbyButton.style.backgroundColor = '#444';
        this.lobbyButton.style.border = '3px solid #fff';
        this.lobbyButton.style.borderRadius = '8px';
        this.lobbyButton.style.cursor = 'pointer';
        this.lobbyButton.style.transition = 'all 0.2s';
        this.lobbyButton.onmouseover = () => {
            this.deathOverlaySelectedIndex = 1;
            this.updateDeathOverlaySelection();
        };
        this.lobbyButton.onclick = () => {
            if (this.lobbyCallback) {
                this.lobbyCallback();
            }
        };
        buttonContainer.appendChild(this.lobbyButton);

        this.deathOverlay.appendChild(buttonContainer);
        document.body.appendChild(this.deathOverlay);
    }

    public static get Instance(): UIManager {
        return this.instance || (this.instance = new this());
    }

    public displayInsufficientTPWarning() {
        this.tpWarningTimer = this.TP_WARNING_DURATION;
    }

    update(player: Player, deltaTime: number): void {
        // Update Text
        this.hpText.innerText = `${Math.ceil(player.hp)}`;
        this.tpText.innerText = `${Math.ceil(player.tp)}`;

        // Update Rings
        const hpRatio = player.hp / player.maxHp;
        const tpRatio = player.tp / player.maxTp;

        const gap = 0.6;
        const rotationOffset = -20 * (Math.PI / 180);

        // HP: Right side
        this.setArc(this.hpPath, 60, 60, 48, -Math.PI / 2 + gap + rotationOffset, Math.PI / 2 - gap + rotationOffset, hpRatio, false);

        // TP: Left side
        this.setArc(this.tpPath, 60, 60, 48, -Math.PI / 2 - gap + rotationOffset, -Math.PI * 1.5 + gap + rotationOffset, tpRatio, true);

        // Handle TP warning flash
        if (this.tpWarningTimer > 0) {
            const flash = Math.floor(this.tpWarningTimer * 10) % 2 === 0;
            this.tpTrack.setAttribute("stroke", flash ? this.TP_TRACK_FLASH_COLOR : this.TP_TRACK_COLOR);
            this.tpWarningTimer -= deltaTime;
            if (this.tpWarningTimer <= 0) {
                this.tpTrack.setAttribute("stroke", this.TP_TRACK_COLOR);
            }
        }
    }

    showInteractionHint(show: boolean, text: string = '<span class="key-icon">ENTER</span> / <span class="btn-icon xbox-a">A</span> Interact') {
        this.interactionHint.style.display = show ? 'block' : 'none';
        this.interactionHint.innerHTML = text;
    }

    private setArc(path: SVGPathElement, cx: number, cy: number, r: number, startAngle: number, endAngle: number, ratio: number, counterClockwise: boolean) {
        // Clamp ratio
        ratio = Math.max(0, Math.min(1, ratio));

        // Calculate current end angle based on ratio
        const totalAngle = endAngle - startAngle;
        const currentEndAngle = startAngle + (totalAngle * ratio);

        const startX = cx + r * Math.cos(startAngle);
        const startY = cy + r * Math.sin(startAngle);

        const endX = cx + r * Math.cos(currentEndAngle);
        const endY = cy + r * Math.sin(currentEndAngle);

        // Large arc flag
        const angleDiff = Math.abs(currentEndAngle - startAngle);
        const largeArc = angleDiff > Math.PI ? 1 : 0;

        // Sweep flag
        const sweep = counterClockwise ? 0 : 1;

        // If ratio is 0, just move to start
        if (ratio <= 0.001) {
            path.setAttribute("d", `M ${startX} ${startY}`);
            return;
        }

        const d = `M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} ${sweep} ${endX} ${endY}`;
        path.setAttribute("d", d);
    }

    triggerStartTransition(callback: () => void) {
        if (this.fadeOverlay) {
            this.fadeOverlay.classList.add('active');
            setTimeout(() => {
                callback();
            }, 2000);
        } else {
            callback();
        }
    }

    showStartScreen() {
        if (this.startScreen) {
            this.startScreen.style.display = ''; // Remove display: none
            this.startScreen.classList.remove('hidden');
            const video = this.startScreen.querySelector('video');
            if (video) video.play().catch(e => console.log("Video play failed", e));
        }
    }

    hideStartScreen() {
        if (this.startScreen) {
            this.startScreen.classList.add('hidden');
            const video = this.startScreen.querySelector('video');
            if (video) video.pause();
            // Reset tap state when hiding
            this.startScreenTapped = false;
        }
    }

    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'none';
        }
    }

    showLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'flex';
        }
        // Reset progress bar
        if (this.progressBarFill) {
            this.progressBarFill.style.width = '0%';
        }
    }

    updateLoadingProgress(loaded: number, total: number) {
        if (this.progressBarFill) {
            const percentage = total > 0 ? (loaded / total) * 100 : 0;
            this.progressBarFill.style.width = `${percentage}%`;
        }
    }

    /**
     * Show the death overlay with fade-in animation
     */
    showDeathOverlay(onRetry: () => void, onReturnToLobby: () => void) {
        this.retryCallback = onRetry;
        this.lobbyCallback = onReturnToLobby;
        this.deathOverlaySelectedIndex = 0; // Reset to first button

        if (this.deathOverlay) {
            this.deathOverlay.style.display = 'flex';
            // Trigger fade-in after a small delay to ensure display change is applied
            setTimeout(() => {
                this.deathOverlay.style.opacity = '1';
                this.updateDeathOverlaySelection();
            }, 10);
        }
    }

    /**
     * Update death overlay button selection visual
     */
    private updateDeathOverlaySelection() {
        if (!this.retryButton || !this.lobbyButton) return;

        // Update retry button
        if (this.deathOverlaySelectedIndex === 0) {
            this.retryButton.style.backgroundColor = '#666';
            this.retryButton.style.transform = 'scale(1.05)';
        } else {
            this.retryButton.style.backgroundColor = '#444';
            this.retryButton.style.transform = 'scale(1)';
        }

        // Update lobby button
        if (this.deathOverlaySelectedIndex === 1) {
            this.lobbyButton.style.backgroundColor = '#666';
            this.lobbyButton.style.transform = 'scale(1.05)';
        } else {
            this.lobbyButton.style.backgroundColor = '#444';
            this.lobbyButton.style.transform = 'scale(1)';
        }
    }

    /**
     * Handle death overlay controller input
     */
    handleDeathOverlayInput(input: any): void {
        if (!this.deathOverlay || this.deathOverlay.style.display === 'none') return;

        // Navigate left (previous button)
        const navigateLeft = input.isNavigateLeftPressed();
        if (navigateLeft && !this.lastNavigateLeftState) {
            if (this.deathOverlaySelectedIndex > 0) {
                this.deathOverlaySelectedIndex--;
                this.updateDeathOverlaySelection();
            }
        }
        this.lastNavigateLeftState = navigateLeft;

        // Navigate right (next button)
        const navigateRight = input.isNavigateRightPressed();
        if (navigateRight && !this.lastNavigateRightState) {
            if (this.deathOverlaySelectedIndex < 1) {
                this.deathOverlaySelectedIndex++;
                this.updateDeathOverlaySelection();
            }
        }
        this.lastNavigateRightState = navigateRight;

        // Select button
        const select = input.isSelectPressed();
        if (select && !this.lastSelectState) {
            if (this.deathOverlaySelectedIndex === 0 && this.retryCallback) {
                this.retryCallback();
            } else if (this.deathOverlaySelectedIndex === 1 && this.lobbyCallback) {
                this.lobbyCallback();
            }
        }
        this.lastSelectState = select;
    }

    private lastNavigateLeftState: boolean = false;
    private lastNavigateRightState: boolean = false;
    private lastSelectState: boolean = false;

    /**
     * Show centralized control hints at bottom center of screen
     * @param html - HTML content for the control hints
     */
    showControlHints(html: string) {
        this.controlHints.innerHTML = html;
        this.controlHints.style.display = 'block';
    }

    /**
     * Hide centralized control hints
     */
    hideControlHints() {
        this.controlHints.style.display = 'none';
    }

    /**
     * Hide the death overlay with fade-out animation
     */
    hideDeathOverlay() {
        if (this.deathOverlay) {
            this.deathOverlay.style.opacity = '0';
            // Hide after fade-out animation completes
            setTimeout(() => {
                this.deathOverlay.style.display = 'none';
            }, 1000);
        }
    }
}
