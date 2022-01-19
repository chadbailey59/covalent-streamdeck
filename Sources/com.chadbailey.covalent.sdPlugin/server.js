const express = require("express");
const app = express();
const expressWs = require("express-ws")(app);
const port = 3434;
const WebSocket = require("ws");
const argv = require("yargs-parser")(process.argv.slice(2), {
  configuration: {
    "short-option-groups": false,
  },
});

var camContext, micContext;
/*
2/11/2021, 5:04:32 PM: {"_":[],"port":28196,"pluginUUID":"84882112B0F1AF415DE9790A9D3956E9","registerEvent":"registerPlugin","info":"{\"application\":{\"language\":\"en\",\"platform\":\"mac\",\"version\":\"4.9.2.13193\"},\"devicePixelRatio\":2,\"devices\":[{\"id\":\"8F0E1B1D81BAA32A25D8EEC4F610FBA4\",\"name\":\"Stream Deck\",\"size\":{\"columns\":5,\"rows\":3},\"type\":0}],\"plugin\":{\"version\":\"1.0.0\"}}"}
*/

console.log("!!!!! starting up");
fs = require("fs");

function cblog(str) {
  fs.appendFile(
    "cov.log",
    new Date().toLocaleString() + ": " + str + "\n",
    (e) => console.log(e)
  );
}

cblog(JSON.stringify(argv));

var sdws = new WebSocket("ws://localhost:" + argv.port);

sdws.onopen = () => {
  // register the plugin
  var json = {
    event: argv.registerEvent,
    uuid: argv.pluginUUID,
  };
  sdws.send(JSON.stringify(json));
};

// listen for events from streamdeck
sdws.onmessage = (msg) => {
  cblog("message received from stream deck: " + msg.data);
  var d = JSON.parse(msg.data);
  if (d.event == "willAppear") {
    if (d.action == "com.chadbailey.covalent.cam") {
      cblog("setting cam context to: " + d.context);
      camContext = d.context;
      updateStates(2, 2);
    } else if (d.action == "com.chadbailey.covalent.mic") {
      cblog("setting mic context to: " + d.context);
      micContext = d.context;
      updateStates(2, 2);
    }
  }
  // forward to client(s)
  expressWs.getWss().clients.forEach((client) => client.send(msg.data));
};

function updateStates(camState, micState) {
  var camJson = {
    event: "setState",
    context: camContext,
    payload: {
      state: camState,
    },
  };
  var micJson = {
    event: "setState",
    context: micContext,
    payload: {
      state: micState,
    },
  };
  cblog("sending jsons: " + JSON.stringify(camJson) + JSON.stringify(micJson));
  sdws.send(JSON.stringify(camJson));
  sdws.send(JSON.stringify(micJson));
}

app.ws("/ws", function (ws, req) {
  ws.on("connection", function (ws) {
    cblog("client connected");
  });
  ws.on("message", function (msg) {
    cblog("got a message: " + msg);
    try {
      var m = JSON.parse(msg);

      cblog("m: " + m + ", m.message: " + m.message);
      switch (m.message) {
        case "update-state":
          cblog(
            "I better update state for audio: " +
              m.data.audio +
              ", video: " +
              m.data.video
          );
          updateStates(m.data.video, m.data.audio);
          break;
        default:
          cblog("Didn't know what to do with this: " + msg);
      }
    } catch (e) {
      cblog("error: " + e);
    }
  });
  ws.on("close");
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

//app.use(express.static('public'))

app.listen(port, () => {
  cblog(`Example app listening at http://localhost:${port}`);
});
