FROM node:16-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ENV PORT=3000

EXPOSE $PORT

CMD ["npm", "start"]


# # Start from Node.js 14 image
# FROM node:14

# # Set working directory to /app
# WORKDIR /app

# # Copy package.json and package-lock.json to /app
# COPY package*.json ./

# # Install dependencies
# RUN npm ci

# # Copy all files to /app
# COPY . .

# # Set environment variable for app port
# ENV PORT=3000

# # Set command to start the app
# CMD ["npm", "start"]
