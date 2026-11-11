# syntax=docker/dockerfile:1
FROM node:24.22.1-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS build
WORKDIR /app
# nuxt prepare (postinstall) needs the project sources. No local .env or artifacts enter this stage.
COPY . .
RUN --mount=type=cache,target=/root/.npm npm ci
# Non-production only: no analytics collection, no real Visits snapshot, and noindex retained.
RUN CONTEXT=docker DEPLOY_PRIME_URL=http://localhost:8080 npm run generate

FROM node:24.22.1-alpine@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53 AS runtime
ENV NODE_ENV=production PORT=8080
WORKDIR /app
# The runtime has no npm dependencies, build tools, credentials, or source checkout.
RUN rm -rf /usr/local/lib/node_modules /opt/yarn* /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/yarn*
COPY --from=build --chown=node:node /app/.output/public ./public
COPY --chown=node:node scripts/serve-static.mjs scripts/isDirectRun.mjs ./scripts/
COPY --chown=node:node netlify/edge-functions/geo.ts ./netlify/edge-functions/
USER node
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/en/').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))"
CMD ["node", "scripts/serve-static.mjs", "public", "--container"]
