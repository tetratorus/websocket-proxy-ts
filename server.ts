import express from "express";
import cors from "cors";
import { io, Socket } from "socket.io-client";

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "*",
  })
); // TODO: cache this so that we dont make additional preflight requests

type WebsocketConfigs = {
  wsEndpoint: string;
  path: string;
  query: {
    sessionId: string;
  };
  transports: string[];
  withCredentials: boolean;
  reconnectionDelayMax: number;
  reconnectionAttempts: number;
};

const websocketConfigs: {
  [id: string]: WebsocketConfigs;
} = {};

const websocketConnections: {
  [id: string]: Socket | null;
} = {};

const websocketMessages: {
  [id: string]: any[];
} = {};

app.get("/proxy/:id", (req, res) => {
  res.send({ messages: websocketMessages[req.params.id] || [] });
});

app.post("/emit", (req, res) => {
  const { id, event, args } = req.body;
  console.log("what is the event", event, args);
  if (!websocketConnections[id]) {
    res.status(400).send({ success: false, error: "no websocket connection" });
    return;
  }
  websocketConnections[id]?.emit(event, args, () => {
    console.log("after emit")
  });
  console.log("is here successful");
  res.send({ success: true });
})

app.post("/getId", (req, res) => {
  // const id = Math.random().toString(36).slice(2, 11);
  const {
    wsEndpoint,
    path,
    query,
    transports,
    withCredentials,
    reconnectionDelayMax,
    reconnectionAttempts,
  } = req.body;
  const wsConfig = {
    wsEndpoint,
    path,
    query,
    transports,
    withCredentials,
    reconnectionDelayMax,
    reconnectionAttempts,
  };
  const wsConnection = io(wsEndpoint, {
    path,
    query,
    transports,
    withCredentials,
    reconnectionDelayMax,
    reconnectionAttempts,
  });

  wsConnection.on("connect", () => {
    websocketConfigs[wsConnection.id] = wsConfig;
    websocketConnections[wsConnection.id] = wsConnection;
    websocketMessages[wsConnection.id] = [];
    wsConnection.on("disconnect", () => {
      console.log("id", wsConnection.id, "disconnect");
    });
    // wsConnection.onAny((ev) => {
    //   console.log("something?", ev);
    // });
    wsConnection.on("send", (args: any) => {
      console.log("id", wsConnection.id, "send", args);
      websocketMessages[wsConnection.id].push({
        event: "send",
        args,
      })
    });
    wsConnection.on("precompute_complete", (args: any) => {
      console.log("id", wsConnection.id, "precompute_complete", args);
    });
    res.send({ id: wsConnection.id });
  });

});

app.listen(9000);
