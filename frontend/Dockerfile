# syntax=docker/dockerfile:1.6
FROM --platform=$BUILDPLATFORM node:18-alpine as build

WORKDIR /app

COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi

COPY . .

ARG REACT_APP_API_URL
ARG REACT_APP_PORTAL_BASE_URL
ARG REACT_APP_PUBLIC_BASE_URL
ARG REACT_APP_FIREFLY_URL

ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV REACT_APP_PORTAL_BASE_URL=${REACT_APP_PORTAL_BASE_URL}
ENV REACT_APP_PUBLIC_BASE_URL=${REACT_APP_PUBLIC_BASE_URL}
ENV REACT_APP_FIREFLY_URL=${REACT_APP_FIREFLY_URL}

ARG GENERATE_SOURCEMAP=false
ENV GENERATE_SOURCEMAP=${GENERATE_SOURCEMAP}
ENV NODE_OPTIONS=--max_old_space_size=4096

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
