import * as readline from "readline/promises";
import { fileURLToPath } from "url";
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import { client, getConfig } from "./utils.js";

const __filename = fileURLToPath(import.meta.url);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const SENDER = "Nishana";

const send = async (host, message) => {
  const Client = client(host);

  try {
    await Client.connect();

    const result = await Client.query(
      `INSERT INTO ASYNC_MESSAGES (SENDER_NAME, MESSAGE, SENT_TIME) VALUES ('${SENDER}', '${message}', NOW())`
    );
  } catch (error) {
    throw error;
  } finally {
    await Client.end();
  }
};

if (isMainThread) {
  const config = await getConfig();

  if (config) {
    const workers = config.hosts.map(
      (host) => new Worker(__filename, { workerData: { host } })
    );

    try {
      while (true) {
        const message = await rl.question("Enter a message: ");
        const workerIndex = Math.floor(Math.random() * workers.length);
        const worker = workers[workerIndex];

        worker.on("message", (result) => {
          console.log("result", result);
        });

        worker.postMessage(message);
      }
    } catch (error) {
      throw error;
    }
  }
} else {
  parentPort.on("message", async (message) => {
    const result = await send(workerData.host, message);
    console.log(result);
    parentPort.postMessage(
      `Sender ${SENDER} sent '${message}' to host '${workerData.host}' at time 'XXXX'.`
    );
  });
}
