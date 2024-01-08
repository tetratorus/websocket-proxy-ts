import { keccak256 } from "@toruslabs/metadata-helpers";
import { generatePrivate } from "@toruslabs/eccrypto";
import * as tss from "@toruslabs/tss-lib";
import { getDKLSCoeff, Client } from "@toruslabs/tss-client";
import { DELIMITERS, setupSockets, generateTSSEndpoints } from "./utils";
import BN from "bn.js";
import { ec as EC } from "elliptic";

export const CURVE = new EC("secp256k1");

// const tssNodeEndpoints = [
//   "https://node-1.node.web3auth.io",
//   "https://node-2.node.web3auth.io",
//   "https://node-3.node.web3auth.io",
//   "https://node-4.node.web3auth.io",
//   "https://node-5.node.web3auth.io",
// ]

// const tssNodeEndpoints = [
//   "https://node-1.dev-node.web3auth.io",
//   "https://node-2.dev-node.web3auth.io",
//   "https://node-3.dev-node.web3auth.io",
//   "https://node-4.dev-node.web3auth.io",
//   "https://node-5.dev-node.web3auth.io",
// ]

const tssNodeEndpoints = [
  "http://localhost:8000",
  "http://localhost:8001",
  "http://localhost:8002",
  "http://localhost:8003",
  "http://localhost:8004",
]

const tssPartyIndexes = [1, 2, 3, 4, 5];

// randomize node indexes to use
let nodeIndexes = tssPartyIndexes.slice();
nodeIndexes.splice(Math.floor(Math.random() * tssPartyIndexes.length), 1);
nodeIndexes.splice(Math.floor(Math.random() * (tssPartyIndexes.length - 1)), 1);

const verifier = "test-verifier";
const verifierId = "test-verifier-id";
const tssNonce = 0;
const tssShareIndex = 2;
const tssShare = "88d14480dddd8c7cb3b8c6b8ff3ff44f9d2632eb331e9edcc46260c7efce2d44";
const tssPubKey = "LUSiu5pp5DCVDmzEfGf7BEQ0a2Qr3ClW6OPG2yXagNWXmIfuHr1gh6uUfLGwrWjSkGu/IJ394pD7SRokoOMJzw==";
const signatures: any[] = [];
// const postboxKey = "41090c569199c7fd5893b2e15e19a21a3409e3bc497a1fa8d27c929e54f4f239";

// account info


const vid = `${verifier}${DELIMITERS.Delimiter1}${verifierId}`;
const sessionId = `${vid}${DELIMITERS.Delimiter2}default${DELIMITERS.Delimiter3}${tssNonce}${DELIMITERS.Delimiter4}`;

const sign = async (msgHash: Buffer) => {
  try {
    const parties = 4;
    const clientIndex = parties - 1;
    // eslint-disable-next-line @typescript-eslint/no-shadow
    // 1. setup
    // generate endpoints for servers
    const randomSessionNonce = Buffer.from(
      keccak256(
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        Buffer.from(generatePrivate().toString("hex") + Date.now(), "utf8")
      )
    ).toString("hex");
    const tssImportUrl = `${tssNodeEndpoints[0] as string}/v1/clientWasm`;
    // session is needed for authentication to the web3auth infrastructure holding the factor 1
    const currentSession = `${sessionId}${randomSessionNonce as string}`;

    const midRes = await fetch(
      "https://sapphire-1.auth.network/tss/v1/clientWasm"
    );
    console.log("there 4-1");
    const wasmModule = midRes
      .arrayBuffer()
      .then(async (buff) => WebAssembly.compile(buff));

    const { endpoints, tssWSEndpoints, partyIndexes } = generateTSSEndpoints(
      tssNodeEndpoints,
      parties,
      clientIndex,
      tssPartyIndexes
    );

    const loadedWasmModule = await wasmModule;
    console.log("pre socket setup");
    // setup mock shares, sockets and tss wasm files.
    const sockets = await setupSockets(tssWSEndpoints, randomSessionNonce);
    console.log("post socket setup");
    await tss.default(loadedWasmModule);
    console.log("post tss default");

    const participatingServerDKGIndexes = nodeIndexes;
    const dklsCoeff = getDKLSCoeff(
      true,
      participatingServerDKGIndexes,
      tssShareIndex
    );
    const denormalisedShare = dklsCoeff
      .mul(new BN(tssShare, "hex"))
      .umod(CURVE.curve.n);
    const share = denormalisedShare
      .toArrayLike(Buffer, "be", 32)
      .toString("base64");

    if (!currentSession) {
      throw new Error(`sessionAuth does not exist ${currentSession}`);
    }

    if (!signatures) {
      throw new Error(`Signature does not exist ${signatures}`);
    }
    console.log("pre client");

    const client = new Client(
      currentSession,
      clientIndex,
      partyIndexes,
      endpoints,
      sockets,
      share,
      tssPubKey,
      true,
      tssImportUrl
    );
    console.log("post client");
    const serverCoeffs: Record<number, string> = {};
    for (let i = 0; i < participatingServerDKGIndexes.length; i += 1) {
      const serverIndex = participatingServerDKGIndexes[i];
      serverCoeffs[serverIndex as number] = getDKLSCoeff(
        false,
        participatingServerDKGIndexes,
        tssShareIndex,
        serverIndex
      ).toString("hex");
    }
    console.log("pre precompute");
    client.precompute(tss, { signatures, server_coeffs: serverCoeffs });
    console.log("post precompute");
    await client.ready();
    console.log("post ready");
    const { r, s, recoveryParam } = await client.sign(
      tss,
      Buffer.from(msgHash).toString("base64"),
      true,
      "",
      "keccak256",
      {
        signatures,
      }
    );
    console.log("post sign");
    await client.cleanup(tss, { signatures, server_coeffs: serverCoeffs });
    return {
      v: recoveryParam,
      r: r.toArrayLike(Buffer, "be", 32),
      s: s.toArrayLike(Buffer, "be", 32),
    };
  } catch (error: unknown) {
    console.error("mpc keyring controller sign:", error);
    throw error;
  }
};

sign(Buffer.from("hello world", "utf8")).then((res) => {
  console.log(res);
});
