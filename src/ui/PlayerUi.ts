import { MobileControlsManager } from '../controls/MobileControlsManager';
import { Player } from '../player/Player';

export class PlayerUi {
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

    constructor(parent: HTMLDivElement, player: Player, private readonly mobileControlsManager: MobileControlsManager) {
        this.id = player.id;

        const isMobileDevice = this.mobileControlsManager.isMobile;

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
        skillsWrapper.style.justifyContent = 'flex-start';
        skillsWrapper.style.pointerEvents = mobileControlsManager.isMobile ? 'auto' : 'none';
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
                    this.mobileControlsManager.triggerSkillPress(skillKey);
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

            if (!player.isSkillUnlocked(i)) {
                container.style.display = 'none';
                fill.style.display = 'none';
                continue;
            }

            container.style.display = 'block';

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
