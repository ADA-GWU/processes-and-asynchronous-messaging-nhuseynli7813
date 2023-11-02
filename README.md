## Setup

### 1. Installation

Refer to the [official website of Docker](https://www.docker.com/) to install **Docker** on your machine.

Install the required packages in the project root:

```bash
npm  install
```

### 2. Configure Environment

You can update the environment variables in [.env](./.env) file as per your requirements as well as the network settings in [config.json](./config.json) file.

```json
{
  "subnet": "10.0.0.0/24", // Docker network subnet for databases and software
  "gateway": "10.0.0.1", // Default subnet gateway
  "sender": "10.0.0.2", // Sender software host
  "reader": "10.0.0.3", // Reader software host
  "hosts": ["10.0.0.4", "10.0.0.5", "10.0.0.6", "10.0.0.7"] // Database hosts
}
```

After you correctly configured the environment, generate a Docker Compose file:

```bash
npm run generate-docker-compose
```

This will generate a Docker Compose file based on your configuration. For example, the default configuration file will generate 4 PostgreSQL services as well as 2 dependent sender and reader services.

## Build & Run

After you generated a Docker Compose file, build and run the containers:

```bash
docker compose up -d --build
```

The project includes the following scripts in [package.json](./package.json) file. In order to send and read messages, we will run `send` and `read` scripts in their containers, respectively.

```json
{
  "scripts": {
    "generate-docker-compose": "node generateDockerCompose.js",
    "send": "node sender.js",
    "read": "node reader.js"
  }
}
```

To begin to send messages, run:

```bash
docker compose exec sender npm run send
```

This will run `npm run send` in sender software and prompt you to enter messages to send until you deliberately quit the program.

To begin to read messages, run:

```bash
docker compose exec reader npm run read
```

This will run `npm run read` in reader software and ask you to press `Enter` to read an available message until you deliberately quit the program.
