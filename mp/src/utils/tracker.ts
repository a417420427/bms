// 埋点上报占位
export enum OperationMark {
  NAVIGATE_TO = "NAVIGATE_TO",
  API_ERROR = "API_ERROR",
}

export enum OperationType {
  PAGE_ACTION = "PAGE_ACTION",
  SYSTEM_EVENT = "SYSTEM_EVENT",
}

interface TrackerPayload {
  operationMark: OperationMark;
  operationType: OperationType;
  requestParams?: string;
}

class Tracker {
  trigger(payload: TrackerPayload, _silent = false) {
    // 真实场景下上报到后端
    console.debug("[tracker]", payload);
  }
}

export const tracker = new Tracker();
