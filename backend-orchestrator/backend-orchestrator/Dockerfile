# Use the official Bun image
FROM oven/bun:1 as base
WORKDIR /app

# Copy package files
COPY package.json ./

# Install all dependencies (including dev dependencies needed for inngest subpaths)
# Note: We install without frozen lockfile first time to generate/update bun.lock
RUN bun install

# Copy source code
COPY . .

# Run the app
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "src/index.ts" ]
