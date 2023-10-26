import * as dotenv from "dotenv";
import * as readline from "readline/promises";
import { fileURLToPath } from "url";
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import { client, getConfig } from "./utils.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const SENDER = process.env.NAME;

const send = async (host, message) => {
  const Client = client(host);

  try {
    await Client.connect();

    const { rows } = await Client.query(
      `INSERT INTO ASYNC_MESSAGES (SENDER_NAME, MESSAGE, SENT_TIME) VALUES ('${SENDER}', '${message}', NOW()) RETURNING *`
    );

    return rows[0];
  } catch (error) {
    throw error;
  } finally {
    await Client.end();
  }
};

const prompt = () => {
  return rl.question("Enter a message (or type 'exit' to exit): ");
};

const waitThread = (worker) => {
  return new Promise((resolve) => {
    worker.on("message", async (result) => {
      resolve(result);
    });
  });
};

if (isMainThread) {
  const config = await getConfig();

  if (config) {
    const workers = config.hosts.map(
      (host) => new Worker(__filename, { workerData: { host } })
    );

    try {
      let message = await prompt();

      while (message !== "exit") {
        const workerIndex = Math.floor(Math.random() * workers.length);
        const worker = workers[workerIndex];

        console.log(`Host ${config.hosts[workerIndex]} selected.`);

        worker.postMessage(message);

        const result = await waitThread(worker);

        console.log(result);

        message = await prompt();
      }

      rl.close();
    } catch (error) {
      throw error;
    }
  }
} else {
  parentPort.on("message", async (message) => {
    const result = await send(workerData.host, message);

    parentPort.postMessage(
      `Sender ${SENDER} sent '${result.message}' to host '${workerData.host}' at time '${result.sent_time}'.`
    );
  });
}
