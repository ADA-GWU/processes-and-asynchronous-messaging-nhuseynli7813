FROM node:lts-alpine

WORKDIR /usr/src/app

COPY package.json ./
COPY package-lock.json ./
COPY config.json ./
COPY sender.js ./
COPY utils.js ./

RUN npm install