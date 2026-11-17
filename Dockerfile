# Stage 1: build the React client with Vite.
FROM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
# The client imports shared constants and option lists from src/, so the build stage needs it too.
COPY vite.config.js ./
COPY src ./src
COPY web ./web
RUN npm run build

# Stage 2: runtime image with production dependencies and the built client only.
FROM node:26-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY server.js ./
COPY src ./src
COPY --from=build /app/dist ./dist
USER node
EXPOSE 8080
CMD ["node", "server.js"]
