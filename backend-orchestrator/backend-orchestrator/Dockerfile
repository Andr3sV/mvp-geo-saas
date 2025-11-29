# Use the official Bun image
FROM oven/bun:1 as base
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install all dependencies (including dev dependencies needed for inngest subpaths)
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Run the app
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "src/index.ts" ]
