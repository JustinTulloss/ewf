Earth Wind and Fire
-------------------

Firebase -> Redis translator.

### Usage

- Client subscribes to a firebase path by subscribing to that path on Redis
  - EX: `SUBSCRIBE my/data`
- Client publishes the firebase path as a string to the 'firebase-subscriptions' channel on redis
  - This informs the daemon that it should subscribe to updates from firebase
  - EX: `PUBLISH firebase-subscriptions my/data`
- The client will then receive the current value as JSON published to the path
- On any update to the value, the client will receive the value as JSON published to the path

### Development

- You should have docker available locally, either on linux or via [boot2docker](http://boot2docker.io/) on Mac.
  - If you're using boot2docker, you should make port 6379 forward to the VM
- Install [fig](http://www.fig.sh/) via `sudo pip install -U fig`
- Start redis by running `fig up`
- Start the daemon by running `FIREBASE_URL=<YOUR FIRBASE URL> node index.js`

### Deployment

The important environment variables that should be set are `REDIS_PORT_6379_TCP_PORT` and `REDIS_PORT_6379_TCP_ADDR`. Those should be set to the appropriate port and address values to connect to Redis.

You should also set `FIREBASE_URL` to your production Firebase URL.

#### Docker deployment

- Build the docker image with `docker build . -t <your tag>`
- Run the docker image with `docker run --env FIREBASE_URL=<YOUR FIREBASE URL> --env REDIS_PORT_6379_TCP_ADDR=<YOUR REDIS SERVER ADDRESS> --env REDIS_PORT_6379_TCP_PORT=<YOUR REDIS PORT> <your tag>
  - Alternatively, you can pass `--link <your redis container>:redis` to `run` and all the environment variables for redis will be filled out. You still need to pass in the Firebase url however.
