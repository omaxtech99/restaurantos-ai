FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      build-essential \
      curl \
      git \
      postgresql \
      postgresql-contrib \
      redis-server \
      sudo \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable

RUN echo "ubuntu ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

USER ubuntu
WORKDIR /home/ubuntu
