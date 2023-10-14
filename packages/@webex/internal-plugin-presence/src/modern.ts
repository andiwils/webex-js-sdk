import {cloneDeep} from 'lodash';
import Stream from './modern-stream';
import * as CONSTANTS from './modern.constants';
import {EVENTS} from './modern-stream.constants';
import {PresenceStatusObject, WebexObject} from './modern.types';
import {batchArray, ensureArray} from './utils';

const DEFAULT_SUBSCRIPTION_TTL = 600;
const USER = 'user';
const USER_PRESENCE_ENABLED = 'user-presence-enabled';

const findCompositionByKey = (obj, key) => obj.compositions.find((o) => o.type === key).composition;

const extractPresenceFromEvent = ({data}) => ({
  subject: data.user,
  status: findCompositionByKey(data, 'availability').type,
  statusTime: findCompositionByKey(data, 'lastActivity').lastActiveTime,
  lastActive: findCompositionByKey(data, 'lastActivity').lastActiveTime,
  expiresTTL: data.ttl,
});

interface ConstructorOptions {
  webex: WebexObject;
}

/**
 * Modern class to interact with the Apheleia V2 API.
 */
class Modern {
  static namespace = CONSTANTS.NAMESPACE;

  private webex: WebexObject;

  private stream: Stream;

  presences: PresenceStatusObject[] = [];

  /**
   * Constructor for the Modern class
   * @param {WebexObject} webex - webex object to perform requests
   */
  constructor({webex}: ConstructorOptions) {
    this.webex = webex;
    this.stream = new Stream(this.webex);
    this.handleUserstateEvent = this.handleUserstateEvent.bind(this);
  }

  /**
   * Returns a deep clone of the CONSTANTS object
   */
  get CONSTANTS() {
    return cloneDeep(CONSTANTS);
  }

  /**
   * Initialize the stream.
   *
   * @returns {Promise<void>}
   */
  async initialize() {
    this.stream.listen();
    this.stream.on(EVENTS.EXTERNAL.USERSTATE, this.handleUserstateEvent);
  }

  /**
   * Handle the userstate event fired from Mercury.
   *
   * @param {any} event - The event payload
   * @returns {void}
   */
  handleUserstateEvent(event: any) {
    console.warn('presence.modern handleUserstateEvent', this.presences);
    const presenceObj = extractPresenceFromEvent(event) as PresenceStatusObject;
    this.presences.push(presenceObj);
  }

  /**
   * Trigger an event.
   * @param {string} event
   * @param {any} payload
   * @returns {void}
   */
  emitEvent(event: string, payload: any): void {
    if (payload.type && payload.payload) {
      // NOTE: This is temporary.
      this.webex.internal.presence.trigger(event, payload);
    }
  }

  /**
   * Enables presence feature
   * @returns {Promise<boolean>} resolves with true, if successful
   */
  async enable(): Promise<boolean> {
    const response = await this.webex.internal.feature.setFeature(
      USER,
      USER_PRESENCE_ENABLED,
      true
    );

    return response.value;
  }

  /**
   * Disables presence feature
   * @returns {Promise<boolean>} resolves with false, if successful
   */
  async disable(): Promise<boolean> {
    const response = await this.webex.internal.feature.setFeature(
      USER,
      USER_PRESENCE_ENABLED,
      false
    );

    return response.value;
  }

  /**
   * Returns true if presence is enabled, false otherwise
   * @returns {Promise<boolean>} resolves with true if presence is enabled
   */
  isEnabled(): Promise<boolean> {
    return this.webex.internal.feature.getFeature(USER, USER_PRESENCE_ENABLED);
  }

  /**
   * Gets the current presence status of a given person id
   * @param {string} personId
   * @returns {Promise<PresenceStatusObject>} resolves with status object of person
   */
  async get(personId: string): Promise<PresenceStatusObject> {
    if (!personId) {
      return Promise.reject(new Error('A person id is required'));
    }
  }

  /**
   *
   * @param personIds
   * @param ttl
   * @returns
   */
  async subscribe(
    personIds: string | string[],
    ttl: number = DEFAULT_SUBSCRIPTION_TTL
  ): Promise<PresenceStatusObject[]> {
    const allIds = ensureArray(personIds);
    const users = allIds.map((user) => ({user, refresh: true}));

    console.warn('presence.modern subscribe', {personIds, allIds});

    return this.webex.request({
      method: 'POST',
      api: 'usersub',
      resource: 'subscribe',
      headers: {
        'Cisco-Usersub-Device-Caps': 'subs:2',
        refresh: true,
      },
      body: {
        users,
        ttl,
      },
    });
  }

  /**
   * Posting to the 'subscribe' endpoint establishes a subscription for a given user list with no response data.
   * Subscription creation or refresh prompts a full user data update sent via Mercury. Updates are sent via
   * Mercury `apheleia.subscription_update` events.
   *
   * @param {string | string[]} personIds - IDs of the persons
   * @param {number} [ttl = DEFAULT_SUBSCRIPTION_TTL] - Time To Live for the subscription
   * @returns {Promise<any>} Promise resolving to the response of the request
   */
  subscribeX(personIds: string | string[], ttl: number = DEFAULT_SUBSCRIPTION_TTL): Promise<any> {
    if (!personIds) {
      return Promise.reject(new Error('A person id is required'));
    }

    const subjects: string[] = ensureArray(personIds);
    const batches: string[][] = batchArray(subjects, 50);

    return Promise.all(
      batches
        .map((ids) => ids.map((user) => ({user})))
        .map((users) =>
          this.webex.request({
            method: 'POST',
            api: 'usersub',
            resource: 'subscribe',
            body: {
              users,
              ttl,
            },
          })
        )
    ).then((idBatches) => ({responses: [].concat(...idBatches)}));
  }

  /**
   * Unsubscribes from a person or group of people's presence subscription
   * @param {string | Array} personIds
   * @returns {Promise}
   */
  unsubscribe(personIds) {
    if (!personIds) {
      return Promise.reject(new Error('A person id is required'));
    }

    const users = ensureArray(personIds);

    console.warn('presence.modern unsubscribe', {users});

    return this.webex
      .request({
        method: 'POST',
        api: 'usersub',
        resource: 'unsubscribe',
        body: {
          users,
        },
      })
      .then(() => {
        // Remove the users from the array of presences.
        this.presences = this.presences.filter((item) => !users.includes(item.subject));
      });
  }

  /**
   * Sets the status of a user
   * @param {string} status - The status to be set
   * @param {number} ttlSecs - Time To Live for the status
   * @returns {Promise<any>} Promise resolving to the response of the request
   */
  setStatus(status: string, ttlSecs: number): Promise<any> {
    const operation = ttlSecs > 0 ? 'set' : 'clear';
    const body: Record<string, any> = {operation};

    if (operation === 'set') {
      body.type = status;
      body.ttlSecs = ttlSecs;
    }

    return this.webex.request({
      method: 'POST',
      api: 'apheleiaV2',
      resource: 'availabilityOverride',
      body,
    });
  }
}

export default Modern;
