# 1. Use Node as the base
FROM node:20-alpine

# --- CHANGE THIS LINE ---
# Just standard OpenSSL!
RUN apk add --no-cache openssl
# ------------------------

# 2. Set the working directory
WORKDIR /app

# 3. Copy package files and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# 4. Copy the rest of your backend code
COPY . .

# 5. Generate Prisma Client types
RUN npx prisma generate

# 6. Build the TypeScript code
RUN npm run build

# 7. The port your app listens on
EXPOSE 3000

# 8. Start the app
CMD ["node", "dist/main.js"]