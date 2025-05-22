# Use official Node.js LTS image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install --production

# Bundle app source
COPY app.js ./

# Expose port and define startup command
EXPOSE 8080
CMD ["npm", "start"]
