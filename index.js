var Firebase = require('firebase');
var redis = require('redis');

var redisConfig = {
  port: process.env.REDIS_PORT_6379_TCP_PORT || 6379,
  host: process.env.REDIS_PORT_6379_TCP_ADDR || 'localhost',
};

var fbUrl = process.env.FIREBASE_URL;
var firebase;
var subscribeClient;
var publishClient;

var SUBSCRIPTION_CHANNEL = 'firebase-subscriptions';

// The set of current subscribed paths
var subscriptions = {};

function path(fbRef) {
  return decodeURIComponent(fbRef.toString().replace(fbUrl, ''));
}

function onChange(ds) {
  console.info('[firebase] change occurred', path(ds.ref()));
  publishClient.publish(path(ds.ref()), JSON.stringify(ds.val()));
}

function subscribe(path) {
  if (!subscriptions[path]) {
    firebase.child(path).on('value', onChange);
    subscriptions[path] = true;
  }
}

function listenForSubscriptions() {
  subscribeClient.subscribe(SUBSCRIPTION_CHANNEL);
  subscribeClient.on('message', function(channel, message) {
    if (channel !== SUBSCRIPTION_CHANNEL) {
      throw new Error("Got message on unknown channel " + channel);
    }
    console.info('[redis subscribe client] Subscribing to ' + message);
    subscribe(message);
  });
}

var usage = "usage: node index.js\n\n\
Environment variables to define:\n \
\t- FIREBASE_URL\tThe URL to your firebase instance (required)\n \
\t- REDIS_PORT_6379_TCP_PORT\tThe port to find the redis instance on \
(defaults to 6379)\n \
\t- REDIS_PORT_6379_TCP_ADDR\tThe address to find Redis at \
(defaults to localhost)\n";

function main(argv) {
  var wantsHelp = argv.indexOf('-h') !== -1 || argv.indexOf('--help') !== -1;
  if (!fbUrl || wantsHelp) {
    console.log(usage);
    process.exit(wantsHelp ? 0 : 1);
  }
  firebase = new Firebase(fbUrl);
  subscribeClient = redis.createClient(redisConfig.port, redisConfig.host);
  publishClient = redis.createClient(redisConfig.port, redisConfig.host);

  subscribeClient.on('error', function (err) {
    console.error("[redis subscribe client] " + err);
  });

  publishClient.on('error', function (err) {
    console.error("[redis publish client] " + err);
  });

  listenForSubscriptions();
}

main(process.argv);
