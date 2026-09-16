# Candidate tags inherited from Integration I; pull/build not performed in this environment.
FROM node:24.20.0-bookworm-slim AS build
WORKDIR /app
# Intentionally fails if a real reviewed root lock is missing. No fake lock, --force or runtime npm install.
COPY package.json package-lock.json .npmrc ./
RUN npm install --global npm@11.19.0 --ignore-scripts && npm ci --ignore-scripts
COPY . .
RUN npm run build
FROM node:24.20.0-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 3000
CMD ["node","dist/apps/api/main.js"]
