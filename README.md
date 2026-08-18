# Quick Crypt Webapp

## Run Self Hosted


```bash
git clone https://github.com/anthony-raffiware/quick-crypt-backend.git

cd  quick-crypt-backend

docker compose -f docker/docker-compose.yml up -d

cd ..

git clone https://github.com/anthony-raffiware/quick-crypt-webapp.git

docker compose -f docker/docker-compose.yml up -d demo-server
```


