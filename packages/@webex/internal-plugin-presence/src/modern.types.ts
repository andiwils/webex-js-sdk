interface FeatureResponse {
  value: boolean;
}

interface Feature {
  setFeature: (user: string, feature: string, enabled: boolean) => Promise<FeatureResponse>;
  getFeature: (user: string, feature: string) => Promise<boolean>;
}

export interface PresenceStatusObject {
  url: string;
  subject: string;
  status: string;
  statusTime: string;
  lastActive: string;
  expires?: string;
  expiresTTL: number;
  expiresTime?: string;
  vectorCounters: Record<string, any>;
  suppressNotifications: boolean;
  lastSeenDeviceUrl: string;
}

export interface WebexObject {
  internal: {
    mercury: {
      connect: () => Promise<void>;
    };
    presence: {
      listenTo: (mercury: any, event: string, handler: (event: any) => void) => void;
      stopListening: (mercury: any, event: string, handler: (event: any) => void) => void;
      trigger: (name: string, envelope: any) => Promise<void>;
      off: (name: string, handler: (event: any) => void) => void;
      on: (name: string, handler: (event: any) => void) => void;
    };
    feature: Feature;
  };
  logger: {
    warn: (...args: any[]) => void;
  };
  request: (obj: any) => Promise<any>;
}
