# syntax=docker/dockerfile:1.28.0@sha256:bb22d9815c728170f72750f4e5b0d672e06176142e1d602c7e66c050100b7e5b
FROM node:24.22.3-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS build
WORKDIR /app
# nuxt prepare (postinstall) needs the project sources. No local .env or artifacts enter this stage.
COPY . .
RUN --mount=type=cache,target=/root/.npm npm ci
# Non-production only: no analytics collection, no real Visits snapshot, and noindex retained.
RUN CONTEXT=docker DEPLOY_PRIME_URL=http://localhost:8080 npm run generate

FROM node:24.22.3-alpine@sha256:116b800c3754b440ee0aa3ed2f20f5bf3d99a554bfd9adeea09ea8017f6e85f5 AS runtime
ENV NODE_ENV=production PORT=8080
WORKDIR /app
# The runtime has no npm dependencies, build tools, credentials, or source checkout.
RUN rm -rf /usr/local/lib/node_modules /opt/yarn* /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/yarn*
COPY --from=build --chown=0:0 /app/.output/public ./public
COPY --chown=0:0 scripts/serve-static.mjs scripts/isDirectRun.mjs ./scripts/
COPY --chown=0:0 netlify/edge-functions/geo.ts ./netlify/edge-functions/
RUN chmod -R a-w /app
USER 10001:10001
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/en/').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))"
CMD ["node", "scripts/serve-static.mjs", "public", "--container"]
