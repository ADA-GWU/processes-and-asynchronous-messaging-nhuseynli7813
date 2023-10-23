import { writeFile } from "fs/promises";
import { stringify } from "yaml";
import { getConfig } from "./utils.js";

(async () => {
  const config = await getConfig();

  if (config) {
    const yaml = {
      version: "3.8",
      services: {},
      networks: {
        nishana: {
          ipam: {
            config: [
              {
                subnet: config.subnet,
                gateway: config.gateway,
              },
            ],
          },
        },
      },
    };

    config.hosts.forEach((host, index) => {
      yaml.services[`db${index + 1}`] = {
        image: "postgres:latest",
        env_file: [".env"],
        networks: {
          nishana: {
            ipv4_address: host,
          },
        },
        volumes: ["./init.sql:/docker-entrypoint-initdb.d/init.sql"],
      };
    });

    await writeFile("docker-compose.yml", stringify(yaml));
  }
})();
