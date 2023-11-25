import * as dotenv from "dotenv";
import * as readline from "readline/promises";
import { fileURLToPath } from "url";
import { Worker, isMainThread, parentPort } from "worker_threads";
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

const prompt = () => {
  return rl.question("Press 'Enter' to read a message (or type 'n' to exit): ");
};

const waitWorker = (worker) => {
  return new Promise((resolve) => {
    worker.on("message", async (result) => {
      resolve(result);
    });
  });
};

const getAvailableMessagesCount = async (host) => {
  const Client = client(host);

  try {
    await Client.connect();

    const result = await Client.query(
      `SELECT COUNT(*) FROM ASYNC_MESSAGES WHERE RECEIVED_TIME IS NULL AND SENDER_NAME != '${process.env.NAME}'`
    );

    return result.rows[0].count;
  } catch (error) {
    throw error;
  } finally {
    await Client.end();
  }
};

const updateLatestAvailableMessage = async (host) => {
  const Client = client(host);

  try {
    await Client.connect();

    await Client.query("BEGIN");

    const {
      rows: [{ record_id }],
    } = await Client.query(
      `SELECT * FROM ASYNC_MESSAGES WHERE RECEIVED_TIME IS NULL AND SENDER_NAME != '${process.env.NAME}' ORDER BY SENT_TIME DESC LIMIT 1 FOR UPDATE`
    );

    const result = await Client.query(
      `UPDATE ASYNC_MESSAGES SET RECEIVED_TIME = NOW() WHERE RECORD_ID = ${record_id} RETURNING *`
    );

    await Client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await Client.query("ROLLBACK");
    throw error;
  } finally {
    await Client.end();
  }
};

if (isMainThread) {
  try {
    let message = await prompt();
    let workers = {};

    while (message !== "n") {
      const availableMessages = await Promise.allSettled(
        config.hosts.map(
          (host) =>
            new Promise((resolve, reject) => {
              const worker = new Worker(__filename, {
                workerData: { host },
              });

              workers[host] = worker;

              worker.postMessage({ host });

              worker.on("message", (result) => {
                resolve(result);
              });

              worker.on("error", (error) => {
                reject(error);
              });
            })
        )
      );
      const hasAvailableMessages = [];

      availableMessages.forEach((result) => {
        if (result.status === "fulfilled") {
          console.log(
            `${result.value.count} available messages at host '${result.value.host}'`
          );

          if (result.value.count > 0) {
            hasAvailableMessages.push(result.value.host);
          }
        }

        if (result.status === "rejected") {
          console.error(`Host unavailable at '${result.reason}'`);
        }
      });

      if (hasAvailableMessages.length === 0) {
        console.log("No available messages at any given host");
        process.exit(0);
      }

      let workerIndex = getRandomIndex(config.hosts.length);

      while (!hasAvailableMessages.includes(config.hosts[workerIndex])) {
        workerIndex = getRandomIndex(config.hosts.length);
      }

      console.log(
        `Host '${config.hosts[workerIndex]}' selected. Reading a message...`
      );

      workers[config.hosts[workerIndex]].postMessage({
        host: config.hosts[workerIndex],
        update: true,
      });

      const result = await waitWorker(workers[config.hosts[workerIndex]]);

      console.log(result);

      message = await prompt();
    }

    rl.close();
    process.exit(0);
  } catch (error) {
    throw error;
  }
} else {
  parentPort.on("message", async ({ host, update }) => {
    if (!update) {
      const count = await getAvailableMessagesCount(host);

      parentPort.postMessage({ host, count });
    } else {
      const result = await updateLatestAvailableMessage(host);

      parentPort.postMessage(
        `Sender '${result.sender_name}' sent '${result.message}' at time '${result.sent_time}'.`
      );
    }
  });
}
