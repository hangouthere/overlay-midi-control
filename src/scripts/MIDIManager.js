// https://www.midi.org/specifications-old/item/table-2-expanded-messages-list-status-bytes

export default class MIDIManager {
  #logger;
  #statusUpdater;

  /** @type {MIDIAccess} */
  #access;

  constructor(logger, statusUpdater) {
    this.#logger = logger;
    this.#statusUpdater = statusUpdater;
  }

  async init() {
    this.#access = await this.requestMidi();

    await this.#openInputs();
    await this.#openOutputs();
  }

  async requestMidi() {
    this.#logger('Checking MIDI Permissions...');

    const result = await navigator.permissions.query({ name: 'midi', sysex: true });

    if ('granted' !== result.state && 'prompt' !== result.state) {
      throw new Error('MIDI is not allowed per permissions');
    }

    this.#logger(`MIDI Permissions: ${result.state}`);

    this.#logger('Requesting MIDI Access...');

    const access = await navigator.requestMIDIAccess({
      software: true,
      sysex: true
    });

    this.#logger(`MIDI I/O Obtained:<br />
          &nbsp;&nbsp;Inputs: ${access.inputs.size}<br />
          &nbsp;&nbsp;Outputs: ${access.outputs.size}
      `);

    return access;
  }

  /**
   * @param {MIDIAccess} access
   */
  async #openInputs() {
    const ports = this.#access.inputs.values();

    for (const port of ports) {
      /** @param {MIDIMessageEvent} message */
      port.onmidimessage = this.#handleIncomingMessage;

      this.#logger(`Opening Input: ${port.name}`);

      await port.open();
    }
  }

  /**
   * @param {MIDIAccess} access
   */
  async #openOutputs() {
    const ports = this.#access.outputs.values();

    for (const port of ports) {
      this.#logger(`Opening Output: ${port.name}`);

      await port.open();
    }
  }

  /**
   * @param {number[]} midiMessage
   */
  async sendMIDIMessage(midiMessage) {
    const ports = this.#access.outputs.values();

    for (const port of ports) {
      port.send(midiMessage);
    }
  }

  /** @param {MIDIMessageEvent} message */
  #handleIncomingMessage = async message => {
    this.#logger(`Message Recieved:
          ${message.currentTarget.name} (${message.currentTarget.type}) 
          -
          Status: ${message.data[0]} |
          Data 1: ${message.data[1]} |
          Data 2: ${message.data[2]}
      `);

    const status = message.data[0];
    const data1 = message.data[1];
    const isOn = message.data[2] === 127;

    this.#statusUpdater(status, data1, isOn);
  };
}
