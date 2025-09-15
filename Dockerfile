# Install dependencies and prepare runtime
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .

# Create required directories
RUN mkdir -p /app/public/data /app/sqlite

VOLUME /app/sqlite

ENV NODE_ENV=production \
    DB_FILE_NAME=/app/sqlite/local.db

EXPOSE 3004

# Build, migrate, and start the application at container startup
CMD ["sh", "-c", "npm run db:migrate && npm run build && npm start -p 3004"]
