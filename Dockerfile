FROM node:19-alpine AS build_node_modules

# Copy Web UI
COPY ./ /app
WORKDIR /app
RUN cd /app/server && npm i --production
RUN cd /app/web && npm i --production

# Copy build result to a new image.
# This saves a lot of disk space.
FROM node:19-alpine
COPY --from=build_node_modules /app /app

COPY ./init.sh /

# Enable this to run `npm run serve`
RUN npm i -g nodemon

# Install Linux packages
RUN apk add -U --no-cache \
  wireguard-tools \
  dumb-init

# Expose Ports
EXPOSE 51820/udp
EXPOSE 51821/tcp

# Set Environment
ENV DEBUG=Server,WireGuard

# Run Web UI
WORKDIR /app
CMD ["/usr/bin/dumb-init", "bash", "/init.sh"]
