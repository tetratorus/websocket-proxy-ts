export type FakeWebSocketOptions = {
  wsEndpoint: string;
  path: string;
  query: { sessionId: string };
  transports: string[];
  withCredentials: boolean;
  reconnectionDelayMax: number;
  reconnectionAttempts: number;
};
export class FakeWebSocket {
  id = '';

  connected = false;

  endpoint: string;

  options: FakeWebSocketOptions;

  messages: any[] = [];

  listeners: any = {};

  constructor(endpoint: string, options: FakeWebSocketOptions) {
    this.endpoint = endpoint;
    this.options = options;

    fetch(`${this.endpoint}/getId`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(this.options),
    })
      .then(async (res) => {
        return res.json();
      })
      .then((json) => {
        this.id = json.id;
        this.connected = true;
        setInterval(() => {
          fetch(`${this.endpoint}/proxy/${this.id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          })
            .then(async (res) => {
              return res.json();
            })
            .then(async (pollingJSON) => {
              if (!pollingJSON.messages) {
                throw new Error('pollingJSON.messages is undefined');
              }
              console.log('pollingJSON', pollingJSON);
              if (this.messages.length < pollingJSON.messages.length) {
                const newMessages = pollingJSON.messages.slice(
                  this.messages.length,
                  pollingJSON.messages.length,
                );
                this.messages = pollingJSON.messages;
                newMessages.forEach(
                  (message: {
                    event: string;
                    args: { [key: string]: any };
                  }) => {
                    this._receive(message.event, message.args);
                  },
                );
              }
            })
            .catch((error) => {
              console.error('error', error);
            });
        }, 1000);
      })
      .catch((error) => {
        console.error(error);
      });
  }

  hasListeners(event: string) {
    if (this.listeners[event] && this.listeners[event].length > 0) {
      return true;
    }
    return false;
  }

  on(event: string, callback: (args: { [key: string]: any }) => void) {
    if (Array.isArray(this.listeners[event])) {
      this.listeners[event] = this.listeners[event].push(callback);
    } else {
      this.listeners[event] = [callback];
    }
  }

  off(event: string) {
    if (this.listeners[event]) {
      this.listeners[event] = [];
    }
  }

  _receive(event: string, args: { [key: string]: any }) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback: any) => {
        callback(args);
      });
    }
  }

  emit(event: string, args: { [key: string]: any }) {
    console.log(`MockWebSocket.emit(${event}) ${JSON.stringify(args)}`);
  }
}


// setupSockets([
//   'http://localhost:9001/','http://localhost:9001','http://localhost:9001','http://localhost:9001','http://localhost:9001',
// ], sessionId).then((sockets) => {