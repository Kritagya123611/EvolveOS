FROM node:20-bullseye-slim

# Install basic hacker tools the agent might need
RUN apt-get update && apt-get install -y git curl python3 build-essential

# Set the working directory
WORKDIR /workspace

# Keep the container alive forever waiting for commands
CMD ["tail", "-f", "/dev/null"]