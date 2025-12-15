# Use Node 20
FROM node:20
# Create app directory
WORKDIR /app
# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install
# Copy source code
COPY . .
# Expose port (Hugging Face uses 7860 by default)
EXPOSE 7860
ENV PORT=7860
# Start command
CMD [ "npm", "start" ]