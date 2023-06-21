/**
 * @file 事件总线
 * @author Perfumere
 */
export const mitt = (isLocal = true) => {
  let list;
  const all = new Map();
  const ctor = {
    $on(type, handler) {
      if (typeof handler !== 'function') {
        return;
      }

      const handlers = all.get(type);

      if (handlers) {
        handlers.push(handler);
      }
      else {
        all.set(type, [handler]);
      }
    },

    $emit(type, evt) {
      if (all.has(type)) {
        for (const handler of all.get(type).slice()) {
          try {
            handler(evt)
          }
          catch (e) {/* None */}
        }
      }

      if (list) {
        const handlers = list.get(type);

        if (handlers) {
          for (const handler of handlers.slice()) {
            try {
              handler(evt)
              handlers.splice(handlers.indexOf(handler) >>> 0, 1);
            }
            catch (e) {/* None */}
          }
        }
      }
    }
  };

  if (isLocal) {
    list = new Map();

    ctor.$off = (type, handler) => {
      const allHandlers = all.get(type);
      const listHandlers = list.get(type);

      if (typeof handler === 'function') {
        if (allHandlers) {
          allHandlers.splice(allHandlers.indexOf(handler) >>> 0, 1);
        }
        if (listHandlers) {
          listHandlers.splice(listHandlers.indexOf(handler) >>> 0, 1);
        }
      }
      else {
        all.set(type, []);
        list.set(type, []);
      }
    };

    ctor.$once = (type, handler) => {
      if (typeof handler !== 'function') {
        return;
      }

      const handlers = list.get(type);

      if (handlers) {
        handlers.push(handler);
      }
      else {
        list.set(type, [handler]);
      }
    };
  }

  return ctor;
};

export class ChannelSocket extends WebSocket {
  constructor(...args) {
    super(...args);

    this.htGap = 30 * 1000;   // 心跳间隔时长
    this.htTimer = null;      // 心跳计时器
    this.linkStatus = false;
    this.queue = [];
    this.eventBus = mitt(true);

    this.addEventListener('open', async () => {
      this.linkStatus = true;

      for (const fn of this.queue) {
        try { await fn(); }
        catch (e) {/* None */ }
      }

      this.queue = [];
      this.htTimer = setInterval(() => this.send({ type: 'PING' }), this.htGap);
    });
    this.addEventListener('message', async event => {
      const data = JSON.parse(event.data);
      this.eventBus.$emit(data.type, data);
    });
  }

  send(data) {
    if (!data) {
      return;
    }
    // CLOSING / CLOSED
    if (this.readyState === 2 || this.readyState === 3) {
      return;
    }

    const message = typeof data === 'string' ? data : JSON.stringify(data);

    // CONNECTING
    if (!this.linkStatus) {
      this.queue.push(() => super.send(message));
    }

    // OPEN
    if (this.readyState === 1) {
      super.send(message);
    }
  }

  close() {
    clearInterval(this.htTimer);
    this.send({ type: 'CHANNEL_LEAVE' });
    super.close();
  }

  on(eventType, callback) {
    this.eventBus.$on(eventType, callback);
  }

  once(eventType, callback) {
    this.eventBus.$once(eventType, callback);
  }

  off(eventType, callback) {
    this.eventBus.$off(eventType, callback);
  }
}
