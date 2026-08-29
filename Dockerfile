# syntax=docker/dockerfile:1

FROM node:22.23.1-bookworm-slim AS base

WORKDIR /app

ENV NPM_CONFIG_UPDATE_NOTIFIER=false

FROM base AS development

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN chown -R node:node /app

USER node

EXPOSE 3000

CMD ["npm", "run", "start:dev"]

FROM base AS build

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM base AS production

ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system catechism \
  && useradd --system --gid catechism --create-home catechism

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

RUN chown -R catechism:catechism /app

USER catechism

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=30s \
  CMD node -e "fetch('http://127.0.0.1:3000/api/v1/health').then((response)=>process.exit(response.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
