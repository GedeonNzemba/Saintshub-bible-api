FROM ghcr.io/puppeteer/puppeteer:23.11.0

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app

COPY package*.json ./

RUN yarn install

COPY . .

CMD ["yarn", "dev"]
