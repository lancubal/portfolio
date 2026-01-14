FROM python:3.10-alpine

# Install build dependencies for C and Rust
# musl-dev and gcc for C
# rust and cargo for Rust
RUN apk add --no-cache \
    gcc \
    musl-dev \
    rust \
    cargo \
    ncurses  \
    # ncurses helps with terminal handling
    bash

# Pre-create useful directories
RUN mkdir -p /home
WORKDIR /home
