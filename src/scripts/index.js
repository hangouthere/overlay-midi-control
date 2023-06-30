import MIDIManager from './MIDIManager.js';
import TwitchPubSub from './TwitchPubSub.js';
import VoiceMap from './VoiceMap.js';

const VOICE_TTL = 3 * 60 * 1000;
const domParser = new DOMParser();

export default class Bootstrapper {
  /** @type {HTMLElement} */
  #elemApp;
  /** @type {HTMLElement} */
  #elemButtonPanel;
  /** @type {HTMLElement} */
  #elemLog;
  /** @type {MIDIManager} */
  #midiManager;
  /** @type {URLSearchParams} */
  #params;

  #rewardTitle = 'Change My Voice';
  #templateId = 'template-toggleButton';
  #template;

  async init() {
    this.#getParams();

    this.#elemApp = document.getElementById('app');
    this.#elemButtonPanel = document.getElementById('buttonPanel');
    this.#elemLog = document.getElementById('log');

    try {
      if (!this.#params.has('username')) {
        throw new Error('"username" needs to be supplied in the URI for this to work!');
      }

      this.#midiManager = new MIDIManager(this.#log, this.#updateStatus);
      await this.#midiManager.init();
    } catch (err) {
      if (err instanceof Error || err instanceof DOMException) {
        this.#log(err.message);
      }

      this.#elemApp.classList.toggle('disabled', true);
      this.#elemApp.classList.toggle('debug', true);

      return console.log(err);
    }

    this.#detectDebug();
    this.#prepButtons();
    this.#prepPubSub();

    this.#rewardTitle = this.#params.get('rewardTitle') ?? this.#rewardTitle;
  }

  #log = msg => {
    this.#elemLog.innerHTML = `${msg}<br />${this.#elemLog.innerHTML}`;
  };

  #getParams() {
    const url = new URL(location.href);
    this.#params = url.searchParams;
  }

  #detectDebug() {
    if (this.#params.get('debug')) {
      this.#elemApp.classList.toggle('debug');
    }
  }

  #prepButtons() {
    this.#template = Handlebars.compile(document.getElementById(this.#templateId).innerHTML, { noEscape: true });

    const voices = Object.entries(VoiceMap);

    voices.forEach(([id, voiceData]) => this.#renderButton({ id, ...voiceData }));

    this.#elemApp.addEventListener('change', this.#onToggleButton);
  }

  #renderButton = data => {
    const renderedTemplate = this.#template(data);

    // Parse the rendered template as HTML
    const newDocument = domParser.parseFromString(renderedTemplate, 'text/html');
    const { firstChild: appendChild } = newDocument.body;

    // Inject the HTML into the container
    this.#elemButtonPanel.appendChild(appendChild);
  };

  async #prepPubSub() {
    const channelId = await this.#getTwitchChannelID();

    const pubsub = new TwitchPubSub(this.#log, channelId);
    pubsub.connectPubSubWebsocket(this.#onPubSubMessage);
  }

  async #getTwitchChannelID() {
    const user = this.#params.get('username');

    const resp = await fetch(`https://decapi.me/twitch/id/${user}`);
    const data = await resp.json();
    return data;
  }

  /**
   * @param {Event} event
   */
  #onToggleButton = event => {
    /** @type {EventTarget} */
    const btn = event.target;

    if (btn instanceof HTMLInputElement) {
      const status = btn.dataset['status'];
      const data1 = btn.dataset['data1'];
      const value = btn.checked ? 127 : 0;

      this.#midiManager.sendMIDIMessage([status, data1, value]);
    }
  };

  /**
   * @param {number} status
   * @param {number} data1
   * @param {boolean} isOn
   */
  #updateStatus = (status, data1, isOn) => {
    /** @type {NodeListOf<HTMLInputElement>} */
    const buttons = this.#elemApp.querySelectorAll('input[type="checkbox"]');

    for (const btn of buttons) {
      const btnStatus = btn.dataset['status'];
      const btnData1 = btn.dataset['data1'];

      if (btnStatus == status && btnData1 == data1) {
        btn.checked = isOn;
      }
    }
  };

  /**
   * @param {MessageEvent} event
   */
  #onPubSubMessage = event => {
    const data = JSON.parse(event.data);

    if (!data.data || !data.data.message) {
      return;
    }

    const msg = JSON.parse(data.data.message);

    if ('reward-redeemed' !== msg.type) {
      return;
    }

    const {
      redemption: {
        user_input: userInput,
        reward: { title: rewardTitle }
      }
    } = msg.data;

    const voiceNum = parseInt(userInput);

    if (this.#rewardTitle !== rewardTitle || isNaN(voiceNum)) {
      return;
    }

    const voiceData = VoiceMap[voiceNum];

    if ((voiceNum <= 0 && !voiceData) || voiceData.exclude) {
      return;
    }

    this.#log(`Enabling Voice (${VOICE_TTL / 1000})s: ${voiceData.name}`);

    // Enable voice over MIDI, and then turn it off after a TTL
    this.#midiManager.sendMIDIMessage([voiceData.status, voiceData.data1, 127]);
    setTimeout(() => {
      this.#log(`Disabling Voice: ${voiceData.name}`);
      this.#midiManager.sendMIDIMessage([voiceData.status, voiceData.data1, 0]);
    }, VOICE_TTL);
  };
}
