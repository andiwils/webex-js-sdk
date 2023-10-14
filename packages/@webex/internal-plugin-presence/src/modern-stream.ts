import {cloneDeep} from 'lodash';
import * as CONSTANTS from './modern-stream.constants';
import {WebexObject} from './modern.types';

export interface EnvelopeObject {
  data: {
    eventType: string;
  };
  event: string;
}

/**
 * Class representing Mercury stream service.
 */
class Stream {
  private webex: WebexObject;
  private activeListeners: string[];

  /**
   * Create a Stream.
   * @param {WebexObject} webex - The webex object to interact with mercury and presence services.
   */
  constructor(webex: WebexObject) {
    this.webex = webex;
    this.activeListeners = [];
  }

  /**
   * Returns a deep clone of the CONSTANTS object
   * @returns {any} The cloned CONSTANTS object
   */
  get CONSTANTS() {
    return cloneDeep(CONSTANTS);
  }

  /**
   * Connects to the mercury service.
   * @returns {Promise<void>} An empty promise if the mercury connection was successful.
   */
  connect(): Promise<void> {
    return this.webex.internal.mercury.connect();
  }

  /**
   * Initializes all event listeners for Presence plugin.
   * @returns {Promise<void[]>} An empty promise once all the listeners are established.
   */
  listen(): Promise<void[]> {
    return Promise.all(
      Object.values(CONSTANTS.EVENTS.INTERNAL).map((internalEvent: string) =>
        this.listenTo(internalEvent)
      )
    );
  }

  /**
   * Stops all event listeners for the Presence plugin.
   * @returns {Promise<string[]>} An empty promise once all active event listeners have been removed.
   */
  stopListening(): Promise<string[]> {
    const listeners = [...this.activeListeners];

    return Promise.all(listeners.map((event: string) => this.stopListeningTo(event)));
  }

  /**
   * Initializes a specific event listener for Presence plugin.
   * @param {string} internalEvent - Event to listen to.
   * @returns {Promise<void>} An empty promise once the connection is established.
   */
  listenTo(internalEvent: string): Promise<void> {
    console.warn('presence modern-stream listenTo', internalEvent);

    if (this.activeListeners.includes(internalEvent)) {
      return Promise.resolve();
    }

    return this.connect().then(() => {
      this.webex.internal.presence.listenTo(
        this.webex.internal.mercury,
        `event:${internalEvent}`,
        (event: any) => this.handleEvent(event)
      );

      this.activeListeners.push(internalEvent);
    });
  }

  /**
   * Stop listening to a specific event for Presence plugin.
   * @param {string} internalEvent - Event to stop listening to.
   * @returns {Promise<string>} A promise resolving to the event which stopped being listened to.
   */
  stopListeningTo(internalEvent: string): Promise<string> {
    if (!this.activeListeners.includes(internalEvent)) {
      return Promise.reject(new Error(`Event "${internalEvent}" is not currently active`));
    }

    this.webex.internal.presence.stopListening(
      this.webex.internal.mercury,
      `event:${internalEvent}`,
      (event: any) => this.handleEvent(event)
    );

    const eventIndex = this.activeListeners.indexOf(internalEvent);
    this.activeListeners.splice(eventIndex, 1);

    return Promise.resolve(internalEvent);
  }

  /**
   * Handles incoming events and routes them for processing.
   *
   * @param {Event} event - The incoming event.
   * @returns {Promise<void>} - A promise that resolves when the event has been processed and emitted.
   */
  handleEvent(event: Event): Promise<void[]> {
    console.warn('modern stream handleEvent', event);

    return this.process(event).then((envelope) => this.fire(envelope));
  }

  /**
   * Processes the received event.
   * @param {any} event - The received event.
   * @returns {Promise<EnvelopeObject>} The processed event.
   */
  process(event: any): Promise<EnvelopeObject> {
    const envelope: EnvelopeObject = cloneDeep(event);
    let promise;

    console.warn('modern stream process', event);

    switch (event.data.eventType) {
      case CONSTANTS.EVENTS.EXTERNAL.USERSTATE:
        envelope.event = CONSTANTS.EVENTS.EXTERNAL.USERSTATE;
        promise = Promise.resolve(envelope);
        console.warn('modern stream process', event.data.type, envelope);
        break;
      default:
        promise = Promise.reject(new Error(`Unknown event type: "${event.data.eventType}"`));
    }

    return promise;
  }

  /**
   * Triggers the event on the presence service.
   * @param {EnvelopeObject} envelope - The processed event.
   * @returns {Promise<void[]>}
   */
  fire(envelope: EnvelopeObject): Promise<void[]> {
    return Promise.all([
      this.webex.internal.presence.trigger(CONSTANTS.EVENTS.EXTERNAL.ALL, envelope),
      this.webex.internal.presence.trigger(envelope.event, envelope),
    ]);
  }

  /**
   * Removes an event handler.
   * @param {string} [name=CONSTANTS.EVENTS.EXTERNAL.ALL] - Event name to stop listening to.
   * @param {function} handler - Handler to remove from the event listener.
   * @returns {void}
   */
  off(name: string = CONSTANTS.EVENTS.EXTERNAL.ALL, handler: (event: any) => void): void {
    this.webex.internal.presence.off(name, handler);
  }

  /**
   * Sets up a new event handler.
   * @param {string} [name=CONSTANTS.EVENTS.EXTERNAL.ALL] - Event name to listen to.
   * @param {function} handler - Handler for the specified event.
   * @returns {void}
   */
  on(name: string = CONSTANTS.EVENTS.EXTERNAL.ALL, handler: (event: any) => void): void {
    this.webex.internal.presence.on(name, handler);
  }
}

export default Stream;
