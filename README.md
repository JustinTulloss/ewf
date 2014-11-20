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
