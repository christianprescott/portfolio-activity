FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json index.ts ./
COPY src ./src
COPY public ./public
RUN npm run build
COPY test ./test

ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000

CMD ["node", "index.ts"]
