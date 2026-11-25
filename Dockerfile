FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json index.html ./
COPY src ./src
COPY public ./public
COPY server ./server
RUN npm run build && npm prune --omit=dev
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/app/data PORT=8816
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/dist ./dist
COPY scripts/backup.mjs ./scripts/backup.mjs
RUN mkdir /app/data && chown node:node /app/data
USER node
EXPOSE 8816
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://localhost:8816/api/health',{headers:{'x-origin-secret':process.env.ORIGIN_SECRET||''}}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","dist/server.mjs"]
