export default class TwitchPubSub {
  /** @type {string} */
  #channelId;
  /** @type {WebSocket} */
  #socket;

  #logger;

  constructor(logger, channelId) {
    this.#logger = logger;
    this.#channelId = channelId;
  }

  /**
   * Connect to the Twitch PubSub websocket and setup the event handlers
   * @param {function} onMessage method to call when events are received
   */
  connectPubSubWebsocket(onMessage) {
    this.#socket = new WebSocket('wss://pubsub-edge.twitch.tv');

    this.#socket.addEventListener('open', this.#onConnected);
    this.#socket.addEventListener('close', this.#onClosed);
    this.#socket.addEventListener('message', onMessage);

    setInterval(this.#pingPong, 240000);
  }

  #randomString(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (var i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  #pingPong = () => {
    this.#socket.send(
      JSON.stringify({
        type: 'PING'
      })
    );
  };

  #onConnected = () => {
    // Create authentication payload and request required events
    var auth = {
      type: 'LISTEN',
      nonce: this.#randomString(18),
      data: {
        topics: ['community-points-channel-v1.' + this.#channelId, 'hype-train-events-v1.' + this.#channelId]
      }
    };

    // Send authentication payload to Twitch
    this.#socket.send(JSON.stringify(auth));
  };

  #onClosed = () => {
    this.#socket = null;
    this.#logger('Twitch Pubsub Websocket Closed');
  };
}
