FROM node:22

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev

COPY --chown=node:node . .

USER node

ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]