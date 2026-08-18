# Quick Crypt Webapp

## Run Self Hosted

Start the API
```bash
git clone https://github.com/anthony-raffiware/quick-crypt-backend.git

cd quick-crypt-backend
```
Copy  [Link](docker/override.env.example) to ./override.env and edit PROD_PASS

```bash
docker compose -f docker/docker-compose.yml up -d

cd ..
```

Run web server to server web app

```bash
git clone https://github.com/anthony-raffiware/quick-crypt-webapp.git

cd quick-crypt-webapp

docker compose -f docker/docker-compose.yml up -d demo-server
```


