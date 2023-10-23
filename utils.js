import * as dotenv from "dotenv";
import { readFile } from "fs/promises";
import pg from "pg";

dotenv.config();

const { Client } = pg;

export const client = (host) =>
  new Client({
    host,
    port: 5432,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  });

export const getConfig = async () => {
  try {
    const config = JSON.parse(
      await readFile("config.json", { encoding: "utf8" })
    );

    return config;
  } catch (error) {
    return null;
  }
};
