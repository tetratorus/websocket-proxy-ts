import { FakeWebSocket } from "./ws";

export const DELIMITERS = {
  Delimiter1: "\u001c",
  Delimiter2: "\u0015",
  Delimiter3: "\u0016",
  Delimiter4: "\u0017",
};

export const generateTSSEndpoints = (
  tssNodeEndpoints: string[],
  parties: number,
  clientIndex: number,
  nodeIndexes: number[],
) => {
  const endpoints: string[] = [];
  const tssWSEndpoints: string[] = [];
  const partyIndexes: number[] = [];
  for (let i = 0; i < parties; i += 1) {
    partyIndexes.push(i);
    if (i === clientIndex) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      endpoints.push(null as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tssWSEndpoints.push(null as any);
    } else {
      endpoints.push(
        tssNodeEndpoints[nodeIndexes[i] ? nodeIndexes[i] - 1 : i] as string,
      );
      tssWSEndpoints.push(
        new URL(
          tssNodeEndpoints[nodeIndexes[i] ? nodeIndexes[i] - 1 : i] as string,
        ).origin,
      );
    }
  }
  return { endpoints, tssWSEndpoints, partyIndexes };
};

export const setupSockets = async (
  tssWSEndpoints: string[],
  sessionId: string
) => {
  try {
    const sockets = await createSockets(tssWSEndpoints, sessionId);
    // console.log('sockets', sockets);
    // wait for websockets to be connected
    await new Promise((resolve) => {
      const checkConnectionTimer = setInterval(() => {
        for (let i = 0; i < sockets.length; i++) {
          if (sockets[i] !== null || !sockets[i].connected) {
            return;
          }
        }
        clearInterval(checkConnectionTimer);
        resolve(true);
      }, 500);
    });
    return sockets;
  } catch (error) {
    console.error(`error in setupSockets: ${error}`);
    return null;
  }
};

export const createSockets = async (
  wsEndpoints: string[],
  sessionId: string
): Promise<any> => {
  return wsEndpoints.map((wsEndpoint) => {
    if (wsEndpoint === null || wsEndpoint === undefined) {
      return null;
    }
    console.log("what is the wsendpoint", wsEndpoint);
    return new FakeWebSocket("http://localhost:9000", {
      wsEndpoint,
      path: "/tss/socket.io",
      query: { sessionId },
      transports: ["polling"],
      withCredentials: true,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 5,
    });
    // return io(wsEndpoint, {
    //   path: '/tss/socket.io',
    //   query: { sessionId },
    //   transports: ['polling'],
    //   withCredentials: true,
    //   // reconnectionDelayMax: 10000,
    //   // reconnectionAttempts: 5,
    // });
  });
};
