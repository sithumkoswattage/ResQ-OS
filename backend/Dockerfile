# 1. Choose a lightweight base environment
FROM node:18-alpine

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy dependency manifest files first
COPY package*.json ./

# 4. Install dependencies inside the container
RUN npm install

# 5. Copy the rest of your backend source code
COPY . .

# 6. Expose the port the backend listens on
EXPOSE 5000

# 7. Define the startup command
CMD ["node", "server.js"]