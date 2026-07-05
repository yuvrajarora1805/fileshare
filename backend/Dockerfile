FROM node:20-alpine

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Create the uploads directory
RUN mkdir -p uploads

# Expose the backend port
EXPOSE 5000

# Start the server
CMD ["node", "server.js"]
