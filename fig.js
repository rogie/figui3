function uniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2)
}
function supportsPopover() {
    return HTMLElement.prototype.hasOwnProperty("popover");
}


/* Button */
class FigButton extends HTMLElement {
    constructor() {
        super()
        this.button = document.createElement("button")
    }
    connectedCallback() {
        if (!this.contains(this.button)) {
            this.render()
            this.appendChild(this.button)
        }
    }
    render() {
        this.button.innerHTML = this.innerHTML || 'Button'
        this.textContent = ''
    }
    static get observedAttributes() {
        return ['disabled'];
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (this.button) {
            this.button[name] = newValue
            if (newValue === "false") {
                this.button.removeAttribute(name)
            }
        }
    }
}
window.customElements.define('fig-button', FigButton);

/* Dropdown */
class FigDropdown extends HTMLElement {
    #trigger
    #select
    #type = "select"
    constructor() {
        super()
    }
    connectedCallback() {

        this.#trigger = this.querySelector('[slot=trigger]')
        if (this.#trigger) {
            this.append(this.#trigger)
        }

        this.#select = document.createElement("select")
        this.append(this.#select)
        Array.from(this.querySelectorAll("option")).forEach(option => {
            this.#select.append(option)
        })

        this.#select.addEventListener("change", this.handleChange.bind(this))

        if (this.getAttribute("type") === "dropdown") {
            this.#type = "dropdown"
        }

    }
    attributeChangedCallback(name, oldValue, newValue) {
        //console.log(name, newValue)
    }

    handleChange() {
        if (this.#type === "dropdown") {
            this.#select.selectedIndex = 0
        }
    }
}
window.customElements.define('fig-dropdown', FigDropdown);

/* Tooltip */
class FigTooltip extends HTMLElement {
    constructor() {
        super()
        this.action = this.getAttribute("action") || "hover"
        this.delay = parseInt(this.getAttribute("delay")) || 500
        this.isOpen = false
    }
    connectedCallback() {
        this.setup()
        this.setupEventListeners()
    }

    disconnectedCallback() {
        this.destroy()
    }

    setup() {

    }

    render() {
        this.destroy()
        this.popup = document.createElement('span');
        this.popup.setAttribute("class", "fig-tooltip")
        this.popup.style.position = "fixed"
        this.popup.style.pointerEvents = "none"
        this.popup.innerText = this.getAttribute("text")
        document.body.append(this.popup)
    }

    destroy() {
        if (this.popup) {
            this.popup.remove()
        }
        document.body.addEventListener("click", this.hidePopupOutsideClick)
    }

    setupEventListeners() {
        if (this.action === "hover") {
            this.addEventListener("mouseenter", this.showDelayedPopup.bind(this));
            this.addEventListener("mouseleave", this.hidePopup.bind(this));
        } else if (this.action === "click") {
            this.addEventListener("click", this.showDelayedPopup.bind(this));
            document.body.addEventListener("click", this.hidePopupOutsideClick.bind(this))
        }
    }

    getOffset() {
        const defaultOffset = { left: 8, top: 4, right: 8, bottom: 4 };
        const offsetAttr = this.getAttribute("offset");
        if (!offsetAttr) return defaultOffset;

        const [left, top, right, bottom] = offsetAttr.split(",").map(Number);
        return {
            left: isNaN(left) ? defaultOffset.left : left,
            top: isNaN(top) ? defaultOffset.top : top,
            right: isNaN(right) ? defaultOffset.right : right,
            bottom: isNaN(bottom) ? defaultOffset.bottom : bottom
        };
    }

    showDelayedPopup() {
        this.render()
        clearTimeout(this.timeout)
        this.timeout = setTimeout(this.showPopup.bind(this), this.delay)
    }

    showPopup() {
        const rect = this.getBoundingClientRect()
        const popupRect = this.popup.getBoundingClientRect()
        const offset = this.getOffset()

        // Position the tooltip above the element   
        let top = rect.top - popupRect.height - offset.top
        let left = rect.left + (rect.width - popupRect.width) / 2
        this.popup.setAttribute("position", "top")

        // Adjust if tooltip would go off-screen
        if (top < 0) {
            this.popup.setAttribute("position", "bottom")
            top = rect.bottom + offset.bottom; // Position below instead
        }
        if (left < offset.left) {
            left = offset.left;
        } else if (left + popupRect.width > window.innerWidth - offset.right) {

            left = window.innerWidth - popupRect.width - offset.right;
        }

        this.popup.style.top = `${top}px`;
        this.popup.style.left = `${left}px`;
        this.popup.style.opacity = "1";
        this.popup.style.display = "block"
        this.popup.style.pointerEvents = "all"
        this.popup.style.zIndex = parseInt((new Date()).getTime() / 1000)

        this.isOpen = true
    }

    hidePopup() {
        clearTimeout(this.timeout)
        this.popup.style.opacity = "0"
        this.popup.style.display = "block"
        this.popup.style.pointerEvents = "none"
        this.destroy()
        this.isOpen = false
    }

    hidePopupOutsideClick(event) {
        if (this.isOpen && !this.popup.contains(event.target)) {
            this.hidePopup()
        }
    }
}

customElements.define("fig-tooltip", FigTooltip);

/* Popover */
class FigPopover extends FigTooltip {
    static observedAttributes = ["action", "size"];

    constructor() {
        super()
        this.action = this.getAttribute("action") || "click"
        this.delay = parseInt(this.getAttribute("delay")) || 0
    }
    render() {
        //this.destroy()
        //if (!this.popup) {
        this.popup = this.popup || this.querySelector("[popover]")
        this.popup.setAttribute("class", "fig-popover")
        this.popup.style.position = "fixed"
        this.popup.style.display = "block"
        this.popup.style.pointerEvents = "none"
        document.body.append(this.popup)
        //}
    }

    destroy() {

    }
}
customElements.define("fig-popover", FigPopover);

/* Dialog */
class FigDialog extends FigTooltip {

    constructor() {
        super()
        this.action = this.getAttribute("action") || "click"
        this.delay = parseInt(this.getAttribute("delay")) || 0
        this.dialog = document.createElement("dialog")
        this.header = document.createElement("fig-header")
        this.header.innerHTML = `<span>${this.getAttribute("title") || "Title"}</span>`
        if (this.getAttribute("closebutton") !== "false") {
            this.closeButton = document.createElement("fig-button")
            this.closeButton.setAttribute("icon", "true")
            this.closeButton.setAttribute("variant", "ghost")
            this.closeButton.setAttribute("fig-dialog-close", "true")
            let closeIcon = document.createElement("fig-icon")
            closeIcon.setAttribute("class", "close")
            this.closeButton.append(closeIcon)
            this.header.append(this.closeButton)
        }
        this.dialog.append(this.header)
    }
    render() {
        this.popup = this.popup || this.dialog
        document.body.append(this.popup)
    }
    setup() {
        this.dialog.querySelectorAll("[fig-dialog-close]").forEach(e => e.addEventListener("click", this.hidePopup.bind(this)))
        this.dialog.append(this.querySelector("fig-content") || "")
    }
    hidePopup() {
        this.popup.close()
    }
    showPopup() {
        this.popup.style.zIndex = parseInt((new Date()).getTime() / 1000)
        if (this.getAttribute("modal") === "true") {
            this.popup.showModal()
        } else {
            this.popup.show()
        }
    }
    destroy() {

    }
}
customElements.define("fig-dialog", FigDialog);


class FigPopover2 extends HTMLElement {
    #popover
    #trigger
    #id
    #delay
    #timeout
    #action

    constructor() {
        super()
    }
    connectedCallback() {
        this.#popover = this.querySelector('[popover]')
        this.#trigger = this
        this.#delay = Number(this.getAttribute("delay")) || 0
        this.#action = this.getAttribute("trigger-action") || "click"
        this.#id = `tooltip-${uniqueId()}`
        if (this.#popover) {
            this.#popover.setAttribute("id", this.#id)
            this.#popover.setAttribute("role", "tooltip")
            this.#popover.setAttribute("popover", "manual")
            this.#popover.style['position-anchor'] = `--${this.#id}`

            this.#trigger.setAttribute("popovertarget", this.#id)
            this.#trigger.setAttribute("popovertargetaction", "toggle")
            this.#trigger.style['anchor-name'] = `--${this.#id}`

            if (this.#action === "hover") {
                this.#trigger.addEventListener("mouseover", this.handleOpen.bind(this))
                this.#trigger.addEventListener("mouseout", this.handleClose.bind(this))
            } else {
                this.#trigger.addEventListener("click", this.handleToggle.bind(this))
            }

            document.body.append(this.#popover)
        }
    }

    handleClose() {
        clearTimeout(this.#timeout)
        this.#popover.hidePopover()
    }
    handleToggle() {
        if (this.#popover.matches(':popover-open')) {
            this.handleClose()
        } else {
            this.handleOpen()
        }
    }
    handleOpen() {
        clearTimeout(this.#timeout)
        this.#timeout = setTimeout(() => {
            this.#popover.showPopover()
        }, this.#delay)
    }
}
window.customElements.define('fig-popover-2', FigPopover2);


/* Tabs */
class FigTabs extends HTMLElement {
    constructor() {
        super()
    }
    connectedCallback() {
        const tabs = this.querySelectorAll('fig-tab')
        const name = this.getAttribute("name") || ("tabs-" + this.uniqueId())
        for (const tab of tabs) {
            let input = document.createElement('input')
            input.type = "radio"
            input.name = name
            input.checked = tab.hasAttribute("selected")
            input.value = tab.getAttribute("value") || this.slugify(tab.innerText)
            tab.setAttribute("label", tab.innerText)
            tab.append(input)
            input.addEventListener("input", this.handleInput.bind(this))
        }
    }
    uniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2)
    }
    slugify(text) {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    handleInput() {
        const radios = this.querySelectorAll("[type=radio]")
        for (const radio of radios) {
            if (radio.checked) {
                this.value = radio.value
                radio.parentNode.setAttribute("selected", "")
            } else {
                radio.parentNode.removeAttribute("selected")
            }
        }
    }
}
window.customElements.define('fig-tabs', FigTabs);

/* Segmented Control */
class FigSegmentedControl extends HTMLElement {
    constructor() {
        super()
    }
    connectedCallback() {
        const segments = this.querySelectorAll('fig-segment')
        const name = this.getAttribute("name") || "segmented-control"
        for (const segment of segments) {
            let input = document.createElement('input')
            input.type = "radio"
            input.name = name
            input.checked = segment.hasAttribute("selected")
            input.value = segment.getAttribute("value")
            segment.append(input)
            input.addEventListener("input", this.handleInput.bind(this))
        }
    }
    handleInput() {
        this.value = this.querySelector(":checked").value
    }
}
window.customElements.define('fig-segmented-control', FigSegmentedControl);



/* Slider */
class FigSlider extends HTMLElement {
    #input
    #textInput
    #slider
    constructor() {
        super()
    }
    connectedCallback() {
        const defaults = {
            range: { min: 0, max: 100, step: 1 },
            hue: { min: 0, max: 255, step: 1 },
            opacity: { min: 0, max: 1, step: 0.01 }
        }
        const type = this.getAttribute("type")
        let html = ''
        let slider = `<div class="slider">
                <input 
                    type="range" 
                    class="${type}"
                    style="--color:${this.getAttribute("color")}">
            </div>`
        if (this.getAttribute("text")) {
            html = `<hstack>
                        ${slider}
                        <fig-input-text
                            placeholder="##"
                            type="number"
                            value="${this.getAttribute("value")}">
                        </fig-input-text>
                    </hstack>`
        } else {
            html = slider
        }
        this.innerHTML = html

        const attrs = ['color', 'step', 'min', 'max', 'value']
        this.#textInput = this.querySelector("input[type=number]")
        this.#slider = this.querySelector('.slider')

        this.#input = this.querySelector('[type=range]')
        this.#input.addEventListener("input", this.handleChange.bind(this))

        for (var i = 0; i < this.attributes.length; i++) {
            var a = this.attributes[i]
            if (attrs.includes(a.name)) {
                if (a.specified) {
                    this.#input[a.name] = a.value
                    if (this.#textInput) {
                        this.#textInput[a.name] = a.value
                    }
                }
            }
        }
        this.#input.disabled = this.hasAttribute("disabled")
        if (this.#textInput) {
            this.#textInput.disabled = this.hasAttribute("disabled")
            this.#textInput.addEventListener("change", this.handleChange.bind(this))
        }
        this.syncProps()
    }
    syncProps() {
        if (!CSS.supports('animation-timeline: scroll()')) {
            let complete = this.#input.value / (this.#input.max - this.#input.min)
            this.#slider.style.setProperty('--slider-percent', `${complete * 100}%`)
        }
    }
    handleChange(event) {
        this.value = event.target.value
        this.#input.value = this.value
        if (this.#textInput) {
            this.#textInput.value = this.value
        }
        this.syncProps()
    }
}
window.customElements.define('fig-slider', FigSlider);

class FigInputText extends HTMLElement {
    constructor() {
        super()
    }
    connectedCallback() {
        const div = document.createElement('div')
        div.innerHTML = this.innerHTML
        const append = div.querySelector('[slot=append]')
        const prepend = div.querySelector('[slot=prepend]')
        this.multiline = this.hasAttribute("multiline") || false

        let html = `<label><input 
      type="${this.getAttribute("type") || "text"}" 
      placeholder="${this.getAttribute("placeholder")}"
      value="${this.getAttribute("value")}" /></label>`
        if (this.multiline) {
            html = `<label><textarea  
      placeholder="${this.getAttribute("placeholder")}">${this.getAttribute("value")}</textarea></label>`
        }
        this.innerHTML = html

        this.input = this.querySelector('input,textarea')
        this.input.addEventListener('input', this.handleInput.bind(this))

        const label = this.querySelector('label')

        if (prepend) {
            label.prepend(prepend)
        }
        if (append) {
            label.append(append)
        }
    }
    handleInput() {
        this.value = this.input.value
    }

    static get observedAttributes() {
        return ['value'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (this.input) {
            this.value = this.input.value = newValue
        }
    }
}
window.customElements.define('fig-input-text', FigInputText);


/* Color swatch */
class FigInputColor extends HTMLElement {
    #rgba
    #swatch
    #textInput
    #alphaInput
    constructor() {
        super()
    }
    connectedCallback() {
        this.#rgba = this.convertToRGBA(this.getAttribute("value"))
        const alpha = (this.#rgba.a * 100).toFixed(0)
        let html = ``
        if (this.getAttribute("text")) {
            let label = `<fig-input-text placeholder="Text" value="${this.getAttribute("value")}"></fig-input-text>`
            if (this.getAttribute("alpha")) {
                label += `<fig-tooltip text="Opacity">
                    <fig-input-text 
                        placeholder="##" 
                        type="number"
                        min="0"
                        max="100"
                        value="${alpha}">
                        <span slot="append">%</slot>
                    </fig-input-text>
                </fig-tooltip>`
            }
            html = `<div class="input-combo">
                <input type="color" />
                ${label}
            </div>`
        } else {
            html = `<input type="color" />`
        }
        this.innerHTML = html

        this.style.setProperty('--alpha', this.#rgba.a)

        this.#swatch = this.querySelector('[type=color]')
        this.#textInput = this.querySelector('[type=text]')
        this.#alphaInput = this.querySelector('[type=number]')

        this.#textInput.value = this.#swatch.value = this.rgbAlphaToHex(this.#rgba, 1)
        this.#swatch.disabled = this.hasAttribute('disabled')
        this.#swatch.addEventListener('input', this.handleInput.bind(this))

        this.#alphaInput.addEventListener('input', this.handleAlphaInput.bind(this))

    }
    handleAlphaInput(event) {
        //do not propagate to onInput handler for web component
        event.stopPropagation()
        this.#rgba = this.convertToRGBA(this.#swatch.value)
        this.#rgba.a = Number(this.#alphaInput.value) / 100
        this.value = this.rgbAlphaToHex(
            {
                r: this.#rgba.r,
                g: this.#rgba.g,
                b: this.#rgba.b
            },
            this.#rgba.a
        )
        this.style.setProperty('--alpha', this.#rgba.a)
        const e = new CustomEvent('input', {
            bubbles: true,
            cancelable: true
        });
        this.dispatchEvent(e)
    }

    handleInput(event) {
        //do not propagate to onInput handler for web component
        event.stopPropagation()

        let alpha = this.#rgba.a
        this.#rgba = this.convertToRGBA(this.#swatch.value)
        this.#rgba.a = alpha
        this.#textInput.value = this.#swatch.value
        this.style.setProperty('--alpha', this.#rgba.a)
        this.value = this.rgbAlphaToHex(
            {
                r: this.#rgba.r,
                g: this.#rgba.g,
                b: this.#rgba.b
            },
            alpha
        )
        this.alpha = alpha
        if (this.#alphaInput) {
            this.#alphaInput.value = this.#rgba.a.toFixed(0)
        }
        const e = new CustomEvent('input', {
            bubbles: true,
            cancelable: true
        });
        this.dispatchEvent(e)
    }

    static get observedAttributes() {
        return ['value', 'style'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        //this[name] = newValue;	
    }

    rgbAlphaToHex({ r, g, b }, a = 1) {
        // Ensure r, g, b are integers between 0 and 255
        r = Math.max(0, Math.min(255, Math.round(r)));
        g = Math.max(0, Math.min(255, Math.round(g)));
        b = Math.max(0, Math.min(255, Math.round(b)));

        // Ensure alpha is between 0 and 1
        a = Math.max(0, Math.min(1, a));

        // Convert to hex and pad with zeros if necessary
        const hexR = r.toString(16).padStart(2, '0');
        const hexG = g.toString(16).padStart(2, '0');
        const hexB = b.toString(16).padStart(2, '0');

        // If alpha is 1, return 6-digit hex
        if (a === 1) {
            return `#${hexR}${hexG}${hexB}`;
        }

        // Otherwise, include alpha in 8-digit hex
        const alpha = Math.round(a * 255);
        const hexA = alpha.toString(16).padStart(2, '0');
        return `#${hexR}${hexG}${hexB}${hexA}`;
    }

    convertToRGBA(color) {
        let r, g, b, a = 1;

        // Handle hex colors
        if (color.startsWith('#')) {
            let hex = color.slice(1);
            if (hex.length === 8) {
                a = parseInt(hex.slice(6), 16) / 255;
                hex = hex.slice(0, 6);
            }
            r = parseInt(hex.slice(0, 2), 16);
            g = parseInt(hex.slice(2, 4), 16);
            b = parseInt(hex.slice(4, 6), 16);
        }
        // Handle rgba colors
        else if (color.startsWith('rgba') || color.startsWith('rgb')) {
            let matches = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)/);
            if (matches) {
                r = parseInt(matches[1]);
                g = parseInt(matches[2]);
                b = parseInt(matches[3]);
                a = matches[4] ? parseFloat(matches[4]) : 1;
            }
        }
        // Handle hsla colors
        else if (color.startsWith('hsla') || color.startsWith('hsl')) {
            let matches = color.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*(\d+(?:\.\d+)?))?\)/);
            if (matches) {
                let h = parseInt(matches[1]) / 360;
                let s = parseInt(matches[2]) / 100;
                let l = parseInt(matches[3]) / 100;
                a = matches[4] ? parseFloat(matches[4]) : 1;

                if (s === 0) {
                    r = g = b = l; // achromatic
                } else {
                    let hue2rgb = (p, q, t) => {
                        if (t < 0) t += 1;
                        if (t > 1) t -= 1;
                        if (t < 1 / 6) return p + (q - p) * 6 * t;
                        if (t < 1 / 2) return q;
                        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                        return p;
                    };

                    let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                    let p = 2 * l - q;
                    r = hue2rgb(p, q, h + 1 / 3);
                    g = hue2rgb(p, q, h);
                    b = hue2rgb(p, q, h - 1 / 3);
                }

                r = Math.round(r * 255);
                g = Math.round(g * 255);
                b = Math.round(b * 255);
            }
        }
        // If it's not recognized, return null
        else {
            return null;
        }

        return { r, g, b, a };
    }
}
window.customElements.define('fig-input-color', FigInputColor);

/* Checkbox */
class FigCheckbox extends HTMLElement {

    constructor() {
        super()
        this.input = document.createElement("input")
        this.input.setAttribute("id", uniqueId())
        this.input.setAttribute("type", "checkbox")
        this.labelElement = document.createElement("label")
        this.labelElement.setAttribute("for", this.input.id)
    }
    connectedCallback() {
        this.checked = this.input.checked = this.hasAttribute("checked") ? this.getAttribute('checked').toLowerCase() === "true" : false
        this.input.addEventListener("change", this.handleInput.bind(this))

        if (this.hasAttribute('disabled')) {
            this.input.disabled = true
        }
        if (this.hasAttribute('indeterminate')) {
            this.input.indeterminate = true
            this.input.setAttribute("indeterminate", "true")
        }

        this.append(this.input)
        this.append(this.labelElement)

        this.render()
    }
    static get observedAttributes() {
        return ["on", "disabled", "label", "checked"];
    }

    render() {

    }

    disconnectedCallback() {
        this.input.remove()
    }

    attributeChangedCallback(name, oldValue, newValue) {
        console.log(`Attribute ${name} change:`, oldValue, newValue);
        switch (name) {
            case "label":
                this.labelElement.innerText = newValue
                break;
            case "checked":
                this.checked = this.input.checked = this.hasAttribute("checked") ? true : false
                break;
        }
    }

    handleInput(e) {
        this.input.indeterminate = false
        this.input.removeAttribute("indeterminate")
        this.value = this.input.value
    }

}
window.customElements.define('fig-checkbox', FigCheckbox);

/* Switch */
class FigSwitch extends FigCheckbox {
    render() {
        this.input.setAttribute("class", "switch")
        this.on = this.input.checked = this.hasAttribute("on") ? this.getAttribute('on').toLowerCase() === "true" : false
    }
}
window.customElements.define('fig-switch', FigSwitch);


/* Template */
class MyCustomElement extends HTMLElement {
    static observedAttributes = ["color", "size"];

    constructor() {
        // Always call super first in constructor
        super();
    }

    connectedCallback() {
        console.log("Custom element added to page.");
    }

    disconnectedCallback() {
        console.log("Custom element removed from page.");
    }

    adoptedCallback() {
        console.log("Custom element moved to new page.");
    }

    attributeChangedCallback(name, oldValue, newValue) {
        console.log(`Attribute ${name} has changed.`);
    }
}

customElements.define("my-custom-element", MyCustomElement);

