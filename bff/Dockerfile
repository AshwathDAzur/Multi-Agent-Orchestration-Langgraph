# BFF service image
FROM node:22-alpine

WORKDIR /app

# Install deps first (layer caching)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# App source
COPY src ./src

EXPOSE 4000
CMD ["node", "src/server.js"]
