# Use the official Node.js image as the base image.
# We're using the slim version to keep the image size small.
FROM node:20-slim

# Set the working directory inside the container.
# All subsequent commands will run from this directory.
WORKDIR /app

# Copy the package.json and package-lock.json files first.
# This allows Docker to use a cached layer for `npm install`
# if the dependency list hasn't changed.
COPY package*.json ./

# Install the dependencies. The `--production` flag ensures
# only production dependencies are installed, which is good practice.
RUN npm install --production

# Copy the rest of your application code into the working directory.
COPY . .

# Expose the port that the application will listen on.
# Cloud Run automatically uses the PORT environment variable,
# but this is good practice for documentation and other environments.
EXPOSE 8080

# The command to run your application.
# Make sure to replace `your-script-name.js` with the actual file name.
CMD [ "node", "your-script-name.js" ]