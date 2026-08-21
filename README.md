# Quypter Webapp

## Run Self Hosted

Start the API
```bash
git clone https://github.com/anthony-raffiware/quypter-backend.git

cd quypter-backend
```

Copy override.env.example to override.env and edit PROD_PASS
```bash
cp docker/override.env.example override.env

docker compose -f docker/docker-compose.yml up -d

cd ..
```

Run web app server

```bash
git clone https://github.com/anthony-raffiware/quypter-webapp.git

cd quypter-webapp

docker compose -f docker/docker-compose.yml up -d demo-server
```

Your instance should be accessible at https://YOUR-HOST:8443/. Note that the demo server uses an automatically created self-signed TLS certificate so an initial 'net::ERR_CERT_AUTHORITY_INVALID' error is expected.


