FROM node:20-alpine

# Install build tools needed for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json .
RUN npm install

COPY server.js .

# Data volume — mount this to persist the database outside the container
VOLUME /app/data

ENV DATABASE_PATH=/app/data/sendlog.db
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server.js"]
