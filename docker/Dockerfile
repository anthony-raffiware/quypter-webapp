FROM node:24-alpine AS build

ARG BASE_HREF='/'
ARG API_URL='http://localhost:8000/qc/api/v1'

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

ENV PATH /app/node_modules/.bin:$PATH

RUN mkdir /app/build

RUN ng build\
  --base-href="${BASE_HREF}"\
  --define "apiUrl='${API_URL}'"\
  --define "base='${BASE_HREF}'"\
  --configuration=production-docker\
  --output-path=/app/build


FROM alpine:3.17 AS cert-builder

RUN apk add --no-cache openssl
ARG DOMAIN_NAME=localhost
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -subj "/CN=${DOMAIN_NAME}" \
    -addext "subjectAltName=DNS:${DOMAIN_NAME}" \
    -keyout /tmp/server.key -out /tmp/server.crt


FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY --from=cert-builder /tmp/server.key /etc/nginx/ssl/server.key
COPY --from=cert-builder /tmp/server.crt /etc/nginx/ssl/server.crt
COPY ./docker/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
