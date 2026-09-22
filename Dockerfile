# Pinned base resolved in accepted Cleanroom; fresh build identity is recorded per release.
ARG NODE_IMAGE=node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm install --global npm@11.19.0 --ignore-scripts && npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM ${NODE_IMAGE} AS production-dependencies
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm install --global npm@11.19.0 --ignore-scripts && npm ci --omit=dev --ignore-scripts

FROM ${NODE_IMAGE} AS release
WORKDIR /app
ENV NODE_ENV=production
ARG SOURCE_SHA
ARG BUILD_TIMESTAMP
LABEL org.opencontainers.image.revision=${SOURCE_SHA} org.opencontainers.image.created=${BUILD_TIMESTAMP}
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/migrations ./migrations
COPY --from=build --chown=node:node /app/licenses ./licenses
USER node
EXPOSE 3000
# Migration entry: node dist/scripts/migrate.js (no test seeding in release).
CMD ["node","dist/apps/api/main.js"]
