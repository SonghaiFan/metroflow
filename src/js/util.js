import { v4 as uuidv4 } from "uuid";

export class DisplaySettings {
  static isDebug = false;
}

export class Observable {
  constructor() {
    this.observers = [];
  }

  registerObserver(observer) {
    if (!this.observers.includes(observer)) {
      this.observers.push(observer);
    }
  }

  unregisterObserver(observer) {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  notifyAllObservers() {
    this.observers.forEach((observer) => observer.notify(this));
  }

  notifyBeforeRemove() {
    this.observers.forEach((observer) => observer.notifyRemove(this));
  }
}

export class Observer {
  constructor(notify, notifyRemove) {
    this.notify = notify;
    this.notifyRemove = notifyRemove;
  }
}

// Export utility functions
export { uuidv4 };
