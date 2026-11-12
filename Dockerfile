# Pinned base resolved in accepted Cleanroom; fresh build identity is recorded per release.
ARG NODE_IMAGE=node:24.22.2-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm install --global npm@11.19.1 --ignore-scripts && npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM ${NODE_IMAGE} AS production-dependencies
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm install --global npm@11.19.1 --ignore-scripts && npm ci --omit=dev --ignore-scripts

FROM ${NODE_IMAGE} AS release
# Release startup uses Node directly; retain the shell required by amvera.yaml.
RUN rm -rf /usr/local/lib/node_modules/npm /opt/yarn-v1.22.22 \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/yarn /usr/local/bin/yarnpkg
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
COPY --from=build --chown=node:node /app/scripts/health-worker.cjs ./scripts/health-worker.cjs
COPY --from=build --chown=node:node /app/scripts/data/curated-official-v1.json ./scripts/data/curated-official-v1.json
COPY --from=build --chown=node:node /app/scripts/data/curated-official-tretyakov-exact-v1.json ./scripts/data/curated-official-tretyakov-exact-v1.json
COPY --from=build --chown=node:node /app/scripts/data/curated-kudago-moscow-a-v1.json ./scripts/data/curated-kudago-moscow-a-v1.json
COPY --from=build --chown=node:node /app/scripts/data/curated-kudago-moscow-b-v1.json ./scripts/data/curated-kudago-moscow-b-v1.json
USER node
EXPOSE 3000
# Migration entry: node dist/scripts/migrate.js (no test seeding in release).
CMD ["node","dist/apps/api/main.js"]
