import { Player } from '../Player';
import { MENU_STYLES } from './MenuManager';
import { StartMenu, StartMenuOption } from '../StartMenu';
import { InputManager } from '../InputManager';
import { MobileControlsManager } from '../MobileControlsManager';
import type { StageMinimapLayout } from '../stages/StageMinimapLayout';

/** Empty border inside the 240x180 minimap canvas (pixels). */
const MINIMAP_VIEWPORT_MARGIN = 14;
/** Radius around the player represented in the minimap viewport (world metres). */
const MINIMAP_WORLD_RADIUS = 40;
/** Vertical squash ratio used to simulate camera tilt in the isometric minimap. */
const MINIMAP_TILT_FACTOR = 0.58;
const MINIMAP_MARKER_RADIUS = 4;
const MINIMAP_TELEPORTER_INACTIVE_COLOR = '#8f96a0';
const MINIMAP_TELEPORTER_ACTIVE_COLOR = '#29bfd3';

class PlayerUI {
    id: string;
    wrapper: HTMLDivElement;
    svg: SVGSVGElement;
    characterProfile: HTMLDivElement;
    hpPath: SVGPathElement;
    tpPath: SVGPathElement;
    tpTrack: SVGPathElement;
    hpText: HTMLDivElement;
    tpText: HTMLDivElement;
    skillContainers: HTMLDivElement[] = [];
    skillFills: HTMLDivElement[] = [];
    skillIcons: HTMLDivElement[] = [];
    private tpWarningTimer: number = 0.0;
    private readonly TP_WARNING_DURATION: number = 1.0;

    constructor(parent: HTMLDivElement, player: Player) {
        this.id = player.id;

        const isMobileDevice = MobileControlsManager.Instance.isMobile;

        this.wrapper = document.createElement('div');
        this.wrapper.style.position = 'absolute';
        if (isMobileDevice) {
            this.wrapper.style.top = '0';
            this.wrapper.style.left = '0';
        } else {
            this.wrapper.style.bottom = '30px';
            this.wrapper.style.left = '30px';
        }
        this.wrapper.style.width = '120px';
        this.wrapper.style.height = '120px';
        this.wrapper.style.pointerEvents = 'none';
        this.wrapper.style.fontFamily = '"Share Tech", Arial, sans-serif';
        this.wrapper.style.fontWeight = 'bold';
        this.wrapper.style.overflow = 'visible';
        parent.appendChild(this.wrapper);

        // SVG
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('width', '120');
        this.svg.setAttribute('height', '120');
        this.svg.style.position = 'absolute';
        this.svg.style.top = '0';
        this.svg.style.left = '0';
        this.wrapper.appendChild(this.svg);

        // Portrait
        this.characterProfile = document.createElement('div');
        this.characterProfile.style.backgroundImage = 'url(images/character_portrait.png)';
        this.characterProfile.style.width = '80px';
        this.characterProfile.style.height = '80px';
        this.characterProfile.style.position = 'absolute';
        this.characterProfile.style.top = '50%';
        this.characterProfile.style.left = '50%';
        this.characterProfile.style.transform = 'translate(-50%, -50%)';
        this.characterProfile.style.backgroundSize = 'cover';
        this.characterProfile.style.backgroundPosition = 'center';
        this.characterProfile.style.backgroundRepeat = 'no-repeat';
        this.characterProfile.style.borderRadius = '50%';
        this.wrapper.appendChild(this.characterProfile);

        // Rings and tracks
        const gap = 0.6;
        const rotationOffset = -20 * (Math.PI / 180);

        const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        bgCircle.setAttribute('cx', '60');
        bgCircle.setAttribute('cy', '60');
        bgCircle.setAttribute('r', '56');
        bgCircle.setAttribute('fill', 'rgb(38, 31, 44, 0.44)');
        bgCircle.setAttribute('stroke', 'rgb(38, 31, 44)');
        bgCircle.setAttribute('stroke-width', '2');
        this.svg.appendChild(bgCircle);

        const portraitBgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        portraitBgCircle.setAttribute('cx', '60');
        portraitBgCircle.setAttribute('cy', '60');
        portraitBgCircle.setAttribute('r', '42');
        portraitBgCircle.setAttribute('fill', 'rgb(48, 35, 57)');
        portraitBgCircle.setAttribute('stroke', 'rgb(104, 104, 152)');
        portraitBgCircle.setAttribute('stroke-width', '2');
        this.svg.appendChild(portraitBgCircle);

        const hpTrack = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hpTrack.setAttribute('fill', 'none');
        hpTrack.setAttribute('stroke', '#550000');
        hpTrack.setAttribute('stroke-width', '14');
        hpTrack.setAttribute('stroke-linecap', 'square');
        this.setArc(hpTrack, 60, 60, 48, -Math.PI / 2 + gap + rotationOffset, Math.PI / 2 - gap + rotationOffset, 1, false);
        this.svg.appendChild(hpTrack);

        this.hpPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.hpPath.setAttribute('fill', 'none');
        this.hpPath.setAttribute('stroke', '#CC2222');
        this.hpPath.setAttribute('stroke-width', '14');
        this.hpPath.setAttribute('stroke-linecap', 'square');
        this.svg.appendChild(this.hpPath);

        this.tpTrack = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.tpTrack.setAttribute('fill', 'none');
        this.tpTrack.setAttribute('stroke', '#000055');
        this.tpTrack.setAttribute('stroke-width', '14');
        this.tpTrack.setAttribute('stroke-linecap', 'square');
        this.setArc(this.tpTrack, 60, 60, 48, -Math.PI / 2 - gap + rotationOffset, -Math.PI * 1.5 + gap + rotationOffset, 1, true);
        this.svg.appendChild(this.tpTrack);

        this.tpPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.tpPath.setAttribute('fill', 'none');
        this.tpPath.setAttribute('stroke', '#3333BB');
        this.tpPath.setAttribute('stroke-width', '14');
        this.tpPath.setAttribute('stroke-linecap', 'square');
        this.svg.appendChild(this.tpPath);

        // Numbers
        this.hpText = document.createElement('div');
        this.hpText.style.position = 'absolute';
        this.hpText.style.left = '125px';
        this.hpText.style.top = '65px';
        this.hpText.style.color = '#97cb92';
        this.hpText.style.fontSize = '24px';
        this.hpText.style.textShadow = '2px 2px 0px #000';
        this.wrapper.appendChild(this.hpText);

        this.tpText = document.createElement('div');
        this.tpText.style.position = 'absolute';
        this.tpText.style.left = '105px';
        this.tpText.style.top = '95px';
        this.tpText.style.color = '#9a7ae9';
        this.tpText.style.fontSize = '20px';
        this.tpText.style.textShadow = '2px 2px 0px #000';
        this.wrapper.appendChild(this.tpText);

        // Skills wrapper
        const skillsWrapper = document.createElement('div');
        skillsWrapper.style.position = 'absolute';
        skillsWrapper.style.top = '10px';
        skillsWrapper.style.left = '125px';
        skillsWrapper.style.display = 'flex';
        skillsWrapper.style.gap = '6px';
        skillsWrapper.style.width = '168px';
        skillsWrapper.style.justifyContent = 'center';
        const mobileControls = MobileControlsManager.Instance;
        skillsWrapper.style.pointerEvents = mobileControls.isMobile ? 'auto' : 'none';
        this.wrapper.appendChild(skillsWrapper);

        // Create skill slots
        player.skills.forEach((skill, index) => {
            const box = document.createElement('div');
            box.style.width = '52px';
            box.style.height = '42px';
            box.style.borderRadius = '6px';
            box.style.backgroundColor = 'rgba(38, 31, 44, 0.4)';
            box.style.border = '2px solid rgb(38, 31, 44)';
            box.style.boxSizing = 'border-box';
            box.style.position = 'relative';
            box.style.zIndex = '1';

            if (isMobileDevice) {
                box.style.pointerEvents = 'auto';
                box.style.cursor = 'pointer';
                box.style.touchAction = 'manipulation';
                box.style.webkitUserSelect = 'none';
                box.style.userSelect = 'none';
                const skillKey = `isSkill${index + 1}Pressed` as 'isSkill1Pressed' | 'isSkill2Pressed' | 'isSkill3Pressed';
                box.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    mobileControls.triggerSkillPress(skillKey);
                });
            } else {
                box.style.pointerEvents = 'none';
            }

            const fill = document.createElement('div');
            fill.style.position = 'absolute';
            fill.style.left = '0';
            fill.style.bottom = '0';
            fill.style.width = '100%';
            fill.style.height = '0%';
            fill.style.backgroundColor = '#FFFFFF44';
            fill.style.zIndex = '2';
            fill.style.pointerEvents = 'none';
            box.appendChild(fill);

            const icon = document.createElement('div');
            icon.style.position = 'absolute';
            icon.style.left = '0';
            icon.style.top = '0';
            icon.style.width = '100%';
            icon.style.height = '100%';
            icon.style.backgroundImage = `url(${skill.icon})`;
            icon.style.backgroundSize = '65%';
            icon.style.backgroundRepeat = 'no-repeat';
            icon.style.backgroundPosition = 'center';
            icon.style.zIndex = '3';
            icon.style.pointerEvents = 'none';
            box.appendChild(icon);

            this.skillContainers.push(box);
            this.skillFills.push(fill);
            this.skillIcons.push(icon);
            skillsWrapper.appendChild(box);
        });
    }

    setArc(path: SVGPathElement, cx: number, cy: number, r: number, startAngle: number, endAngle: number, ratio: number, counterClockwise: boolean) {
        ratio = Math.max(0, Math.min(1, ratio));
        const totalAngle = endAngle - startAngle;
        const currentEndAngle = startAngle + (totalAngle * ratio);
        const startX = cx + r * Math.cos(startAngle);
        const startY = cy + r * Math.sin(startAngle);
        const endX = cx + r * Math.cos(currentEndAngle);
        const endY = cy + r * Math.sin(currentEndAngle);
        const angleDiff = Math.abs(currentEndAngle - startAngle);
        const largeArc = angleDiff > Math.PI ? 1 : 0;
        const sweep = counterClockwise ? 0 : 1;
        if (ratio <= 0.001) {
            path.setAttribute('d', `M ${startX} ${startY}`);
            return;
        }
        const d = `M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} ${sweep} ${endX} ${endY}`;
        path.setAttribute('d', d);
    }

    update(player: Player, deltaTime: number) {
        if (!this.hpText || !this.tpText || !this.hpPath || !this.tpPath || !this.tpTrack) return;

        this.hpText.innerText = `${Math.ceil(player.hp)}`;
        this.tpText.innerText = `${Math.ceil(player.tp)}`;

        const hpRatio = player.hp / player.maxHp;
        const tpRatio = player.tp / player.maxTp;

        const gap = 0.6;
        const rotationOffset = -20 * (Math.PI / 180);

        this.setArc(this.hpPath, 60, 60, 48, -Math.PI / 2 + gap + rotationOffset, Math.PI / 2 - gap + rotationOffset, hpRatio, false);
        this.setArc(this.tpPath, 60, 60, 48, -Math.PI / 2 - gap + rotationOffset, -Math.PI * 1.5 + gap + rotationOffset, tpRatio, true);

        if (this.tpTrack) {
            if (this.tpWarningTimer > 0) {
                const flashOn = (Math.floor(this.tpWarningTimer * 10) % 2) === 0;
                this.tpTrack.setAttribute('stroke', flashOn ? '#AAAADD' : '#000055');
                this.tpWarningTimer -= deltaTime;
                if (this.tpWarningTimer <= 0) this.tpTrack.setAttribute('stroke', '#000055');
            } else {
                this.tpTrack.setAttribute('stroke', '#000055');
            }
        }

        // Skills
        for (let i = 0; i < this.skillContainers.length; i++) {
            const container = this.skillContainers[i];
            const fill = this.skillFills[i];
            const skill = player.skills && player.skills[i];
            if (!container || !fill || !skill) continue;

            const remaining = skill.getRemainingCooldown();
            const cd = skill.cooldown || 0;
            if (skill.isOnCooldown() && cd > 0) {
                container.style.backgroundColor = '#FF606044';
                const filledRatio = Math.max(0, Math.min(1, 1 - (remaining / cd)));
                fill.style.height = `${filledRatio * 100}%`;
                fill.style.display = 'block';
                fill.style.opacity = '1';
            } else {
                container.style.backgroundColor = 'rgba(38, 31, 44, 0.4)';
                fill.style.display = 'none';
                fill.style.height = '0%';
                fill.style.opacity = '1';
            }
        }
    }

    // Trigger a short TP track flash to indicate insufficient TP
    flashTPWarning() {
        this.tpWarningTimer = this.TP_WARNING_DURATION;
    }

    destroy() {
        this.wrapper.parentElement?.removeChild(this.wrapper);
    }
}

export class UIManager {
    private static instance: UIManager; // Singleton

    container: HTMLDivElement;

    interactionHint: HTMLDivElement;
    controlHints: HTMLDivElement; // Centralized control hints display
    startScreen: HTMLDivElement;
    fadeOverlay: HTMLDivElement;
    loadingScreen: HTMLDivElement;
    progressBarFill: HTMLDivElement;
    deathOverlay: HTMLDivElement;
    // Skill cooldown indicator elements (three skills)
    skillsWrapper?: HTMLDivElement;

    playerUIs: Map<string, PlayerUI> = new Map();
    private retryCallback?: () => void;
    private lobbyCallback?: () => void;
    private retryButton?: HTMLButtonElement;
    private lobbyButton?: HTMLButtonElement;
    private deathOverlaySelectedIndex: number = 0; // 0 = Retry, 1 = Return to Lobby
    private startScreenTapHandler?: (e: TouchEvent) => void;
    private startMenu?: StartMenu;
    private startScreenShown: boolean = false;
    private minimapWrapper: HTMLDivElement;
    private minimapCanvas: HTMLCanvasElement;
    private minimapLayout: StageMinimapLayout | null = null;
    private minimapVisible = false;

    public startScreenTapped: boolean = false;

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
        this.container.style.pointerEvents = 'none';
        this.container.style.fontFamily = '"Share Tech", Arial, sans-serif';
        this.container.style.fontWeight = 'bold';
        this.container.style.overflow = 'visible';

        const isMobile = MobileControlsManager.Instance.isMobile;
        if (isMobile) {
            this.container.style.top = '100px';
            this.container.style.left = '10px';
        } else {
            this.container.style.bottom = '30px';
            this.container.style.left = '30px';
        }
        this.container.style.width = '120px';
        this.container.style.height = '120px';
        document.body.appendChild(this.container);

        // Skill cooldown indicators (3 squares above HP/TP)
        const skillsWrapper = document.createElement('div');
        skillsWrapper.style.position = 'absolute';
        skillsWrapper.style.top = '-44px';
        skillsWrapper.style.left = '50%';
        skillsWrapper.style.transform = 'translateX(-50%)';
        skillsWrapper.style.display = 'flex';
        skillsWrapper.style.gap = '6px';
        skillsWrapper.style.width = '120px';
        skillsWrapper.style.justifyContent = 'center';
        skillsWrapper.style.pointerEvents = 'none';
        this.container.appendChild(skillsWrapper);
        this.skillsWrapper = skillsWrapper;

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
        this.controlHints.style.fontFamily = MENU_STYLES.FONT_FAMILY;
        this.controlHints.style.textShadow = '2px 2px 0px #000';
        this.controlHints.style.display = 'none';
        this.controlHints.style.zIndex = String(MENU_STYLES.Z_INDEX_HINTS);
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

        this.minimapWrapper = document.createElement('div');
        this.minimapWrapper.style.position = 'fixed';
        this.minimapWrapper.style.top = '20px';
        this.minimapWrapper.style.right = '20px';
        this.minimapWrapper.style.width = '240px';
        this.minimapWrapper.style.height = '180px';
        this.minimapWrapper.style.pointerEvents = 'none';
        this.minimapWrapper.style.zIndex = '1200';
        this.minimapWrapper.style.display = 'none';
        document.body.appendChild(this.minimapWrapper);

        this.minimapCanvas = document.createElement('canvas');
        this.minimapCanvas.width = 240;
        this.minimapCanvas.height = 180;
        this.minimapCanvas.style.width = '240px';
        this.minimapCanvas.style.height = '180px';
        this.minimapWrapper.appendChild(this.minimapCanvas);
    }

    /**
     * Register a player with the UI so skill indicators are created.
     */
    registerPlayer(player: Player) {
        // If a PlayerUI already exists for this player, destroy it first
        const existing = this.playerUIs.get(player.id);
        if (existing) {
            existing.destroy();
            this.playerUIs.delete(player.id);
        }

        if (!this.skillsWrapper) return;

        const pui = new PlayerUI(this.container, player);
        this.playerUIs.set(player.id, pui);
    }

    public static get Instance(): UIManager {
        return this.instance || (this.instance = new this());
    }

    // Called when player attempts to use a skill without enough TP.
    // Kept as a no-op; can be implemented to flash TP track per-player in future.
    public displayInsufficientTPWarning() {
        // Trigger TP warning flash for all registered player UIs
        this.playerUIs.forEach((pui) => pui.flashTPWarning());
    }

    update(player: Player, deltaTime: number): void {
        this.renderMinimap(player);

        // If no registered player UIs exist, skip
        if (this.playerUIs.size === 0) return;

        // Find the UI for this player
        const pui = this.playerUIs.get(player.id);
        if (!pui) return;

        pui.update(player, deltaTime);
    }

    setMinimapState(layout: StageMinimapLayout | null, visible: boolean): void {
        this.minimapLayout = layout;
        this.minimapVisible = visible;
    }

    private renderMinimap(player: Player): void {
        if (!this.minimapCanvas || !this.minimapWrapper || !this.minimapLayout || !this.minimapVisible) {
            if (this.minimapWrapper) this.minimapWrapper.style.display = 'none';
            return;
        }

        const ctx = this.minimapCanvas.getContext('2d');
        if (!ctx) return;
        this.minimapWrapper.style.display = 'block';

        const width = this.minimapCanvas.width;
        const height = this.minimapCanvas.height;
        const isoRotation = Math.PI / 4;
        const cos = Math.cos(isoRotation);
        const sin = Math.sin(isoRotation);
        const centerX = width / 2;
        const centerY = height / 2;
        const scale = Math.min(
            (width - MINIMAP_VIEWPORT_MARGIN * 2) / (MINIMAP_WORLD_RADIUS * 2),
            (height - MINIMAP_VIEWPORT_MARGIN * 2) / (MINIMAP_WORLD_RADIUS * 2 * MINIMAP_TILT_FACTOR),
        );

        /**
         * Project world XZ coordinates into the minimap's local isometric space.
         * The player position is treated as the viewport center, then a 45° yaw
         * rotation and vertical tilt are applied for the minimap perspective.
         */
        const project = (x: number, z: number): { x: number; y: number } => {
            const dx = x - player.position.x;
            const dz = z - player.position.z;
            const rotatedX = dx * cos - dz * sin;
            const rotatedZ = dx * sin + dz * cos;
            return {
                x: centerX + rotatedX * scale,
                y: centerY + rotatedZ * scale * MINIMAP_TILT_FACTOR,
            };
        };

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(6, 10, 14, 0.8)';
        ctx.fillRect(0, 0, width, height);

        for (const rect of this.minimapLayout.rects) {
            const corners = [
                project(rect.x - rect.width / 2, rect.z - rect.depth / 2),
                project(rect.x + rect.width / 2, rect.z - rect.depth / 2),
                project(rect.x + rect.width / 2, rect.z + rect.depth / 2),
                project(rect.x - rect.width / 2, rect.z + rect.depth / 2),
            ];

            ctx.beginPath();
            ctx.moveTo(corners[0].x, corners[0].y);
            ctx.lineTo(corners[1].x, corners[1].y);
            ctx.lineTo(corners[2].x, corners[2].y);
            ctx.lineTo(corners[3].x, corners[3].y);
            ctx.closePath();

            if (rect.kind === 'corridor') {
                ctx.fillStyle = 'rgba(80, 130, 180, 0.55)';
                ctx.fill();
            } else {
                ctx.fillStyle = 'rgba(95, 185, 230, 0.7)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(180, 235, 255, 0.8)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }

        if (this.minimapLayout.teleporter) {
            const teleporter = project(this.minimapLayout.teleporter.x, this.minimapLayout.teleporter.z);
            ctx.fillStyle = this.minimapLayout.teleporter.active
                ? MINIMAP_TELEPORTER_ACTIVE_COLOR
                : MINIMAP_TELEPORTER_INACTIVE_COLOR;
            ctx.beginPath();
            ctx.arc(teleporter.x, teleporter.y, MINIMAP_MARKER_RADIUS, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = '#ffea00';
        ctx.beginPath();
        ctx.arc(centerX, centerY, MINIMAP_MARKER_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        const fadeSize = 24;
        const topFade = ctx.createLinearGradient(0, 0, 0, fadeSize);
        topFade.addColorStop(0, 'rgba(0,0,0,0.95)');
        topFade.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = topFade;
        ctx.fillRect(0, 0, width, fadeSize);

        const bottomFade = ctx.createLinearGradient(0, height, 0, height - fadeSize);
        bottomFade.addColorStop(0, 'rgba(0,0,0,0.95)');
        bottomFade.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = bottomFade;
        ctx.fillRect(0, height - fadeSize, width, fadeSize);

        const leftFade = ctx.createLinearGradient(0, 0, fadeSize, 0);
        leftFade.addColorStop(0, 'rgba(0,0,0,0.95)');
        leftFade.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = leftFade;
        ctx.fillRect(0, 0, fadeSize, height);

        const rightFade = ctx.createLinearGradient(width, 0, width - fadeSize, 0);
        rightFade.addColorStop(0, 'rgba(0,0,0,0.95)');
        rightFade.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rightFade;
        ctx.fillRect(width - fadeSize, 0, fadeSize, height);
    }

    showInteractionHint(show: boolean, text: string = '<span class="key-icon">ENTER</span> / <span class="btn-icon xbox-a">A</span> Interact') {
        this.interactionHint.style.display = show ? 'block' : 'none';
        this.interactionHint.innerHTML = text;
    }



    /**
     * Shows the main menu on the start screen after START is pressed.
     * Resets the tap flag, hides the "Press START" text, creates the StartMenu,
     * and triggers the fade transition once the player confirms an option.
     * The `onOptionSelected` callback is invoked after the screen fade with the
     * chosen option and (for Load Game) the selected file — this is where the
     * caller handles all game-logic concerns (save loading, scene switching, etc.).
     */
    showStartMenu(
        input: InputManager,
        hasSave: boolean,
        onOptionSelected: (option: StartMenuOption, file?: File) => void,
    ): void {
        this.startScreenTapped = false;

        // The touch handler that advances past the "Press START" screen is no longer
        // needed once the menu is visible.  Keeping it would call preventDefault() on
        // every touchstart inside the start screen, which blocks the browser from
        // synthesising click events and breaks menu-item taps on mobile.
        if (this.startScreen && this.startScreenTapHandler) {
            this.startScreen.removeEventListener('touchstart', this.startScreenTapHandler);
            this.startScreenTapHandler = undefined;
        }

        const startText = this.startScreen?.querySelector('#start-text') as HTMLElement | null;
        if (startText) startText.style.opacity = '0';

        this.startMenu = new StartMenu(
            this.startScreen,
            input,
            hasSave,
            (option) => {
                const file = this.startMenu?.getSelectedFile();
                this.triggerStartTransition(async () => {
                    this.startMenu?.destroy();
                    this.startMenu = undefined;
                    this.hideStartScreen();
                    onOptionSelected(option, file);
                });
            },
        );
    }

    /** Returns true while the start menu is visible (i.e. after START and before option confirm). */
    isStartMenuShowing(): boolean {
        return this.startMenu !== undefined;
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
        if (this.startScreen && !this.startScreenShown) {
            this.startScreen.style.display = ''; // Remove display: none
            this.startScreen.classList.remove('hidden');
            const video = this.startScreen.querySelector('video');
            if (video) video.play().catch(e => console.log("Video play failed", e));
            this.startScreenShown = true;
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

    /**
     * Whether the death overlay is currently visible
     */
    isDeathOverlayVisible(): boolean {
        return this.deathOverlay?.style.display !== 'none';
    }
}
