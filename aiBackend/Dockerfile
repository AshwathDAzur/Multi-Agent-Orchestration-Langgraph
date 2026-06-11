# aiBackend (multi-agent supervisor) image
FROM node:22-alpine

WORKDIR /app

# Install deps first (layer caching)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# App source
COPY src ./src

EXPOSE 2424
# Env is injected by docker-compose; no --env-file here.
CMD ["node", "src/server.js"]
