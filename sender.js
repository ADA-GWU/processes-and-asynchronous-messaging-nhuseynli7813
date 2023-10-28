import * as dotenv from "dotenv";
import * as readline from "readline/promises";
import { fileURLToPath } from "url";
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import { client, getConfig, getRandomIndex } from "./utils.js";

dotenv.config();

const config = await getConfig();

if (!config) {
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const SENDER = process.env.NAME;

const prompt = () => {
  return rl.question("Enter a message (or type 'exit' to exit): ");
};

const waitWorker = (worker) => {
  return new Promise((resolve) => {
    worker.on("message", async (result) => {
      resolve(result);
    });
  });
};

const send = async (host, message) => {
  const Client = client(host);

  try {
    await Client.connect();

    const result = await Client.query(
      `INSERT INTO ASYNC_MESSAGES (SENDER_NAME, MESSAGE, SENT_TIME) VALUES ('${SENDER}', '${message}', NOW()) RETURNING *`
    );

    return result.rows[0];
  } catch (error) {
    throw error;
  } finally {
    await Client.end();
  }
};

if (isMainThread) {
  try {
    let message = await prompt();

    while (message !== "exit") {
      const workers = config.hosts.map(
        (host) => new Worker(__filename, { workerData: { host } })
      );
      const workerIndex = getRandomIndex(config.hosts.length);
      const worker = workers[workerIndex];

      console.log(`Host '${config.hosts[workerIndex]}' selected.`);

      worker.postMessage(message);

      const result = await waitWorker(worker);

      console.log(result);

      message = await prompt();
    }

    rl.close();
    process.exit(0);
  } catch (error) {
    throw error;
  }
} else {
  parentPort.on("message", async (message) => {
    const result = await send(workerData.host, message);

    parentPort.postMessage(
      `Sender '${SENDER}' sent '${result.message}' to host '${workerData.host}' at time '${result.sent_time}'.`
    );
  });
}
