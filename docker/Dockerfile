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


FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
