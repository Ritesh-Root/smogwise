# Stage 1: build the React client with Vite.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY vite.config.js ./
COPY web ./web
RUN npm run build

# Stage 2: runtime image with production dependencies and the built client only.
FROM node:24-alpine
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
