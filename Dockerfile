# Stage 1: Build the Angular app
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build -- --configuration=production

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy the custom Nginx config we just made
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the build output (Updated for your project name)
COPY --from=build /app/dist/hotel-star-booking/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]