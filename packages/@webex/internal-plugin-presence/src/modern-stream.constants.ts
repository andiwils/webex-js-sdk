const EVENT_COMPONENTS = {
  EXTERNAL: {
    RESOURCES: {
      ALL: 'all',
      USERSTATE: 'usersub.userstate',
    },
    SERVICES: {
      USERSUB: 'usersub',
      PRESENCE: 'presence',
    },
    VERBS: {
      CREATE: 'create',
      TERMINATE: 'terminate',
      UPDATE: 'update',
    },
  },
  INTERNAL: {
    EVENT_TYPES: {
      USERSTATE: 'usersub.userstate',
    },
    RESOURCES: {},
    SERVICES: {},
  },
};

const EVENTS = {
  INTERNAL: {
    USERSTATE: [EVENT_COMPONENTS.INTERNAL.EVENT_TYPES.USERSTATE].join('.'),
  },
  EXTERNAL: {
    ALL: [EVENT_COMPONENTS.EXTERNAL.RESOURCES.ALL].join('.'),
    PRESENCE: EVENT_COMPONENTS.EXTERNAL.SERVICES.PRESENCE,
    USERSTATE: EVENT_COMPONENTS.INTERNAL.EVENT_TYPES.USERSTATE,
  },
};

export {EVENT_COMPONENTS, EVENTS};
