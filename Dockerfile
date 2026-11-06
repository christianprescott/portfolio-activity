FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json index.ts ./
COPY src ./src
COPY public ./public
RUN npm run build
RUN chown -R node:node /app/public/dist
COPY test ./test

USER node

ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000

CMD ["node", "index.ts"]
