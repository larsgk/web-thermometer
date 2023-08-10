// @ts-check

import { Thingy52Driver } from "./thingy52-driver.js";

const template = document.createElement('template');
template.innerHTML = `<style>
/* Thermometer column and text */
#thermometer{
    margin:50% 0 0 50%;
    left:-15px;
    top:-100px;
    width:22px;
    height:150px;
    display:block;
    font:bold 14px/152px helvetica, arial, sans-serif;
    text-indent: 20px;
    background: linear-gradient(#fff 0%, #fff 50%, #d00 50%, #d00 100%);
    border-radius:22px 22px 0 0;
    border:5px solid #4a1c03;
    border-bottom:none;
    position:absolute;
    box-shadow:inset 0 0 0 4px #fff;
    color:#4a1c03;
}

/* Thermometer Bulb */
#thermometer:before{
    content:' ';
    width:44px;
    height:44px;
    display:block;
    position:absolute;
    top:142px;
    left:-16px;
    z-index:-1; /* Place the bulb under the column */
    background:#d00;
    border-radius:44px;
    border:5px solid #4a1c03;
    box-shadow:inset 0 0 0 4px #fff;
}

/* This piece here connects the column with the bulb */
#thermometer:after{
    content:' ';
    width:14px;
    height:7px;
    display:block;
    position:absolute;
    top:146px;
    left:4px;
    background:#d00;
}
#celsius {
    position: absolute;
    transform: translateY(0px);
}
</style>
<span id="thermometer"><span id="celsius">20&deg;C</span></span>
`;

export class ThermometerUI extends HTMLElement {
    #thermometer
    #celsius

    constructor() {
        super();

        const shadowRoot = this.attachShadow({mode: 'open'});
        shadowRoot.appendChild(template.content.cloneNode(true));

        this._handleTemperature = this._handleTemperature.bind(this);

    }

    connectedCallback() {
        this.#thermometer = this.shadowRoot.querySelector('#thermometer');
        this.#celsius = this.shadowRoot.querySelector('#celsius');

        Thingy52Driver.addEventListener('temperature-change', this._handleTemperature);

        this._handleTemperature({detail:{celsius:0}});
    }

    disconnectedCallback() {
        Thingy52Driver.removeEventListener('temperature-change', this._handleTemperature);
    }

    _handleTemperature({detail}) {
        this.#celsius.innerHTML = `${detail.celsius.toFixed(1)}&deg;C`;
        this.#celsius.style.transform = `translateY(${-detail.celsius/2}px)`;

        const perc = 50 - (detail.celsius * 0.32);
        this.#thermometer.style.background = `linear-gradient(#fff 0%, #fff ${perc}%, #d00 ${perc}%, #d00 100%)`
    }
}
customElements.define('thermometer-ui', ThermometerUI);
