import { FakeWebSocket } from "./ws";
import KJUR from "jsrsasign";
import TorusUtils from "@toruslabs/torus.js";
import BN from "bn.js";

// const socketIoPrefix = "/tss";
const socketIoPrefix = "";

// export const distributeShares = async (privKey: any, parties: number[], endpoints: string[], localClientIndex: number, session: string) => {
//   const additiveShares = [];
//   const ec = getEcCrypto();
//   let shareSum = new BN(0);
//   for (let i = 0; i < parties.length - 1; i++) {
//     const share = new BN(eccrypto.generatePrivate());
//     additiveShares.push(share);
//     shareSum = shareSum.add(share);
//   }

//   const finalShare = privKey.sub(shareSum.umod(ec.curve.n)).umod(ec.curve.n);
//   additiveShares.push(finalShare);
//   const reduced = additiveShares.reduce((acc, share) => acc.add(share).umod(ec.curve.n), new BN(0));

//   if (reduced.toString(16) !== privKey.toString(16)) {
//     throw new Error("additive shares dont sum up to private key");
//   }

//   // denormalise shares
//   const shares = additiveShares.map((additiveShare, party) => {
//     return additiveShare.mul(getLagrangeCoeff(parties, party).invm(ec.curve.n)).umod(ec.curve.n);
//   });

//   console.log(
//     "shares",
//     shares.map((s) => s.toString(16, 64))
//   );

//   const waiting = [];
//   for (let i = 0; i < parties.length; i++) {
//     const share = shares[i];
//     if (i === localClientIndex) {

//       waiting.push(localStorageDB.set(`session-${session}:share`, Buffer.from(share.toString(16, 64), "hex").toString("base64")));
//       continue;
//     }
//     waiting.push(
//       axios
//         .post(`${endpoints[i]}/share`, {
//           session,
//           share: Buffer.from(share.toString(16, 64), "hex").toString("base64"),
//         })
//         .then((res) => res.data)
//     );
//   }
//   await Promise.all(waiting);
// };

// const setupMockShares = async (endpoints: string[], parties: number[], session: string) => {
//   const privKey = new BN(eccrypto.generatePrivate());
//   // (window as any).privKey = privKey;
//   const pubKeyElliptic = ec.curve.g.mul(privKey);
//   const pubKeyX = pubKeyElliptic.getX().toString(16, 64);
//   const pubKeyY = pubKeyElliptic.getY().toString(16, 64);
//   const pubKeyHex = `${pubKeyX}${pubKeyY}`;
//   const pubKey = Buffer.from(pubKeyHex, "hex").toString("base64");

//   // distribute shares to servers and local device
//   await distributeShares(privKey, parties, endpoints, clientIndex, session);

//   return { pubKey, privKey };
// };


const torus = new TorusUtils({
  metadataHost: "https://sapphire-dev-2-1.authnetwork.dev/metadata",
  network: "cyan",
  enableOneKey: true,
});

export const DELIMITERS = {
  Delimiter1: "\u001c",
  Delimiter2: "\u0015",
  Delimiter3: "\u0016",
  Delimiter4: "\u0017",
};

const jwtPrivateKey = `-----BEGIN PRIVATE KEY-----\nMEECAQAwEwYHKoZIzj0CAQYIKoZIzj0DAQcEJzAlAgEBBCCD7oLrcKae+jVZPGx52Cb/lKhdKxpXjl9eGNa1MlY57A==\n-----END PRIVATE KEY-----`;
export const generateIdToken = (email: string) => {
  const alg = "ES256";
  const iat = Math.floor(Date.now() / 1000);
  const payload = {
    iss: "torus-key-test",
    aud: "torus-key-test",
    name: email,
    email,
    scope: "email",
    iat,
    eat: iat + 120,
  };

  const options = {
    expiresIn: 120,
    algorithm: alg,
  };

  const header = { alg, typ: "JWT" };

  const token = (KJUR as any).jws.JWS.sign(alg, header, payload, jwtPrivateKey, options);

  return token;
};

// export async function fetchPostboxKeyAndSigs(opts: { verifierName: string; verifierId: string, torusNodeEndpoints: string[] }) {
//   const { verifierName, verifierId, torusNodeEndpoints } = opts;
//   const token = generateIdToken(verifierId);

//   const retrieveSharesResponse = await torus.retrieveShares(torusNodeEndpoints, verifierName, { verifier_id: verifierId }, token);

//   const signatures: any[] = [];
//   retrieveSharesResponse.sessionTokensData.filter((session) => {
//     if (session) {
//       signatures.push(
//         JSON.stringify({
//           data: session.token,
//           sig: session.signature,
//         })
//       );
//     }
//     return null;
//   });

//   return {
//     signatures,
//     postboxkey: retrieveSharesResponse.privKey.toString(),
//   };
// }

export const generateTSSEndpoints = (
  tssNodeEndpoints: string[],
  parties: number,
  clientIndex: number,
  nodeIndexes: number[]
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
        tssNodeEndpoints[nodeIndexes[i] ? nodeIndexes[i] - 1 : i] as string
      );
      tssWSEndpoints.push(
        new URL(
          tssNodeEndpoints[nodeIndexes[i] ? nodeIndexes[i] - 1 : i] as string
        ).origin
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
    console.log('sockets', sockets);
    // wait for websockets to be connected
    await new Promise((resolve) => {
      const checkConnectionTimer = setInterval(() => {
        console.log("here 2")
        for (let i = 0; i < sockets.length; i++) {
          if (sockets[i] !== null && !sockets[i].connected) {
            return;
          }
        }
        clearInterval(checkConnectionTimer);
        resolve(true);
      }, 500);
    });
    console.log("here 3")
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
  const sockets = wsEndpoints.map((wsEndpoint) => {
    if (wsEndpoint === null || wsEndpoint === undefined) {
      return null;
    }
    console.log("what is the wsendpoint", wsEndpoint);
    return new FakeWebSocket("http://localhost:9000", {
      wsEndpoint,
      path: `${socketIoPrefix}/socket.io`,
      query: { sessionId },
      transports: ["websocket"],
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
  return sockets;
};
