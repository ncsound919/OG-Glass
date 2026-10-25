# OG-Glass — the design-token server behind the report and marketing renderers.
#
# Two stages: the build compiles TypeScript, the runtime installs only the
# production dependencies. Presets are copied into both because the compiled
# server resolves `../presets` relative to `dist/`.
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
COPY presets ./presets
RUN npm run build

FROM node:20-slim
ENV NODE_ENV=production \
    TRANSPORT=http \
    PORT=3000
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY presets ./presets

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/presets').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
