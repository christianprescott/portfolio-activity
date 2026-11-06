FROM node:24-alpine AS base

WORKDIR /app
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000

FROM base AS development

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN chown -R node:node public/dist

USER node
CMD ["node", "index.ts"]

FROM base AS production

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY index.ts ./index.ts
COPY src ./src
COPY --from=development /app/public ./public

USER node
CMD ["node", "index.ts"]
