import { Player } from './Player';

export class UIManager {
    container: HTMLDivElement;
    hpPath: SVGPathElement;
    tpPath: SVGPathElement;
    hpText: HTMLDivElement;
    tpText: HTMLDivElement;
    interactionHint: HTMLDivElement;
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

    constructor() {
        this.startScreen = document.getElementById('start-screen') as HTMLDivElement;
        this.fadeOverlay = document.getElementById('fade-overlay') as HTMLDivElement;
        this.loadingScreen = document.getElementById('loading-screen') as HTMLDivElement;
        this.progressBarFill = document.getElementById('progress-bar-fill') as HTMLDivElement;

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

        // Background Circle (Portrait Placeholder)
        const bgCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        bgCircle.setAttribute("cx", "60");
        bgCircle.setAttribute("cy", "60");
        bgCircle.setAttribute("r", "40");
        bgCircle.setAttribute("fill", "#222");
        bgCircle.setAttribute("stroke", "#444");
        bgCircle.setAttribute("stroke-width", "2");
        svg.appendChild(bgCircle);

        // Angles for gaps (in radians)
        const gap = 0.6; // ~35 degrees gap at top and bottom
        const rotationOffset = -20 * (Math.PI / 180); // -20 degrees rotation

        // HP Ring (Right - Red)
        // Background Track
        const hpTrack = document.createElementNS("http://www.w3.org/2000/svg", "path");
        hpTrack.setAttribute("fill", "none");
        hpTrack.setAttribute("stroke", "#550000");
        hpTrack.setAttribute("stroke-width", "8");
        hpTrack.setAttribute("stroke-linecap", "round");
        this.setArc(hpTrack, 60, 60, 50, -Math.PI / 2 + gap + rotationOffset, Math.PI / 2 - gap + rotationOffset, 1, false);
        svg.appendChild(hpTrack);

        this.hpPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.hpPath.setAttribute("fill", "none");
        this.hpPath.setAttribute("stroke", "#ff3333");
        this.hpPath.setAttribute("stroke-width", "8");
        this.hpPath.setAttribute("stroke-linecap", "round");
        svg.appendChild(this.hpPath);

        // TP Ring (Left - Blue)
        // Background Track
        const tpTrack = document.createElementNS("http://www.w3.org/2000/svg", "path");
        tpTrack.setAttribute("fill", "none");
        tpTrack.setAttribute("stroke", "#000055");
        tpTrack.setAttribute("stroke-width", "8");
        tpTrack.setAttribute("stroke-linecap", "round");
        this.setArc(tpTrack, 60, 60, 50, -Math.PI / 2 - gap + rotationOffset, -Math.PI * 1.5 + gap + rotationOffset, 1, true);
        svg.appendChild(tpTrack);

        this.tpPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.tpPath.setAttribute("fill", "none");
        this.tpPath.setAttribute("stroke", "#3333ff");
        this.tpPath.setAttribute("stroke-width", "8");
        this.tpPath.setAttribute("stroke-linecap", "round");
        svg.appendChild(this.tpPath);

        // Text Elements
        this.hpText = document.createElement('div');
        this.hpText.style.position = 'absolute';
        this.hpText.style.left = '125px'; // Moved further right (was 110)
        this.hpText.style.top = '65px';
        this.hpText.style.color = '#ff8888';
        this.hpText.style.fontSize = '24px';
        this.hpText.style.textShadow = '2px 2px 0px #000';
        this.container.appendChild(this.hpText);

        this.tpText = document.createElement('div');
        this.tpText.style.position = 'absolute';
        this.tpText.style.left = '105px'; // Moved further right (was 90)
        this.tpText.style.top = '95px';
        this.tpText.style.color = '#8888ff';
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

    update(player: Player) {
        // Update Text
        this.hpText.innerText = `${Math.ceil(player.hp)}`;
        this.tpText.innerText = `${Math.ceil(player.tp)}`;

        // Update Rings
        const hpRatio = player.hp / player.maxHp;
        const tpRatio = player.tp / player.maxTp;

        const gap = 0.6;
        const rotationOffset = -20 * (Math.PI / 180);

        // HP: Right side
        this.setArc(this.hpPath, 60, 60, 50, -Math.PI / 2 + gap + rotationOffset, Math.PI / 2 - gap + rotationOffset, hpRatio, false);

        // TP: Left side
        this.setArc(this.tpPath, 60, 60, 50, -Math.PI / 2 - gap + rotationOffset, -Math.PI * 1.5 + gap + rotationOffset, tpRatio, true);
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
        }
    }

    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'none';
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
