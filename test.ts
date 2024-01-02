import { keccak256 } from "@toruslabs/metadata-helpers";
import { generatePrivate } from "@toruslabs/eccrypto";
import * as tss from "@toruslabs/tss-lib";
import { getDKLSCoeff, Client } from '@toruslabs/tss-client';
import { DELIMITERS, setupSockets, generateTSSEndpoints } from "./utils";
import BN from "bn.js";
import { ec as EC } from 'elliptic';

export const CURVE = new EC('secp256k1');


const tssNodeEndpoints = [
  "https://sapphire-1.auth.network/tss",
  "https://sapphire-2.auth.network/tss",
  "https://sapphire-3.auth.network/tss",
  "https://sapphire-4.auth.network/tss",
  "https://sapphire-5.auth.network/tss",
];

const tssPartyIndexes = [1, 2, 3, 4, 5];

// randomize node indexes to use
let nodeIndexes = tssPartyIndexes.slice()
nodeIndexes.splice(Math.floor(Math.random() * tssPartyIndexes.length), 1)
nodeIndexes.splice(Math.floor(Math.random() * (tssPartyIndexes.length - 1)), 1);

// account info
const userInfo = {
  name: 'Guru Ramu',
  profileImage:
    'https://lh3.googleusercontent.com/a/ACg8ocKrFFPwrSqR7XWD5SonZycHWI8OwYulEzVHq52dSZJsEz4=s96-c',
  email: 'gururamu4497@gmail.com',
  verifier: 'safe-global-production-mail',
  verifierId: 'gururamu4497@gmail.com',
  verifierParams: { verifier_id: 'gururamu4497@gmail.com' },
  typeOfLogin: 'google',
};
const keys = {
  keys: [
    {
      factorKey:
        '4614dee4947471707e6284754a3642eb51e5ed09aacd49acbadd1bc92f5b2314',
      accountType: 'normal',
      data: {
        tssNonce: 0,
        tssPubKey:
          'LUSiu5pp5DCVDmzEfGf7BEQ0a2Qr3ClW6OPG2yXagNWXmIfuHr1gh6uUfLGwrWjSkGu/IJ394pD7SRokoOMJzw==',
        tssShare:
          '88d14480dddd8c7cb3b8c6b8ff3ff44f9d2632eb331e9edcc46260c7efce2d44',
        tssShareIndex: 2,
        signatures: [
          '{"data":"eyJleHAiOjE3MDE5NDAxNzAsInRlbXBfa2V5X3giOiI5NzYxYWZhMDE1MWMyNWU1MWZkN2I1ODNiYmVkNzU1MzZjMGUyMjBiYjk1ODliOTlmMTEyODViN2U3OTI1ZDdlIiwidGVtcF9rZXlfeSI6ImQyNmM5YTZhZDk5YWFlMDU1NWNkMDBjNDEwYjcyMGY3NDJhNWU4OGNkMmRiNTM5ODI0NGU3MTg4NjQ5NmY0ZjYiLCJ2ZXJpZmllcl9uYW1lIjoic2FmZS1nbG9iYWwtcHJvZHVjdGlvbi1tYWlsIiwidmVyaWZpZXJfaWQiOiJndXJ1cmFtdTQ0OTdAZ21haWwuY29tIiwic2NvcGUiOiIifQ==","sig":"fae0a886f75ac87560dbf5524ab6a42ad040dfc60ab40dea92508ef7be3972de338c51d611de3d5900234289eece12fb327f7b963912f9488e38be8be73e3b901c"}',
          '{"data":"eyJleHAiOjE3MDE5NDAxNzAsInRlbXBfa2V5X3giOiI5NzYxYWZhMDE1MWMyNWU1MWZkN2I1ODNiYmVkNzU1MzZjMGUyMjBiYjk1ODliOTlmMTEyODViN2U3OTI1ZDdlIiwidGVtcF9rZXlfeSI6ImQyNmM5YTZhZDk5YWFlMDU1NWNkMDBjNDEwYjcyMGY3NDJhNWU4OGNkMmRiNTM5ODI0NGU3MTg4NjQ5NmY0ZjYiLCJ2ZXJpZmllcl9uYW1lIjoic2FmZS1nbG9iYWwtcHJvZHVjdGlvbi1tYWlsIiwidmVyaWZpZXJfaWQiOiJndXJ1cmFtdTQ0OTdAZ21haWwuY29tIiwic2NvcGUiOiIifQ==","sig":"305e2f4dcb5004bbda2521e5d59374f73a02cc1c0955a1d9201918959839789938e938bdb214b38cf308fe91fab45845b8dba4de367e1e3d82af2bec15f034881b"}',
          '{"data":"eyJleHAiOjE3MDE5NDAxNzAsInRlbXBfa2V5X3giOiI5NzYxYWZhMDE1MWMyNWU1MWZkN2I1ODNiYmVkNzU1MzZjMGUyMjBiYjk1ODliOTlmMTEyODViN2U3OTI1ZDdlIiwidGVtcF9rZXlfeSI6ImQyNmM5YTZhZDk5YWFlMDU1NWNkMDBjNDEwYjcyMGY3NDJhNWU4OGNkMmRiNTM5ODI0NGU3MTg4NjQ5NmY0ZjYiLCJ2ZXJpZmllcl9uYW1lIjoic2FmZS1nbG9iYWwtcHJvZHVjdGlvbi1tYWlsIiwidmVyaWZpZXJfaWQiOiJndXJ1cmFtdTQ0OTdAZ21haWwuY29tIiwic2NvcGUiOiIifQ==","sig":"5735fba1ddb03eac0c655e2b854981ae481b089d95a5ba2c58dbc29653dea4b76d11e7dd18e275dacc6f11ade782010e8d8892445c5729def453e6513fd692e41c"}',
        ],
        nodeIndexes: [1, 2, 4],
      },
    },
  ],
  postboxKey:
    '41090c569199c7fd5893b2e15e19a21a3409e3bc497a1fa8d27c929e54f4f239',
};

const { tssNonce, tssPubKey, tssShare, tssShareIndex, signatures } = keys.keys[0].data;

const verifier = "test-verifier";
const verifierId = "test-verifier-id";

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