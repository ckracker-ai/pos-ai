# ==========================================
# POS-AI BFF — multi-stage (build + runtime)
# ==========================================
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=2020

RUN chown -R node:node /usr/src/app

COPY --chown=node:node package.json package-lock.json* ./
USER node
RUN npm ci --omit=dev

COPY --from=build --chown=node:node /app/dist ./dist

EXPOSE 2020

CMD ["node", "dist/server.js"]
