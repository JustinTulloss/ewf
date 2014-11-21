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

var redisToEvent = {
  'firebase-value': 'value',
  'firebase-child-added': 'child_added',
  'firebase-child-changed': 'child_changed',
  'firebase-child-removed': 'child_removed',
};

// The set of current subscribed paths
var subscriptions = {};
for (var channel in redisToEvent) {
  subscriptions[redisToEvent[channel]] = {};
}

function path(fbRef) {
  return decodeURIComponent(fbRef.toString().replace(fbUrl, ''));
}

function onChange(event, ds) {
  console.info('[firebase] change occurred', path(ds.ref()));
  publishClient.publish(event + ':' + path(ds.ref()), JSON.stringify(ds.val()));
}

var handlers = {};
for (var channel in redisToEvent) {
  var event = redisToEvent[channel];
  handlers[event] = onChange.bind(null, event);
}

function subscribe(event, path) {
  if (!subscriptions[event][path]) {
    console.info('[redis subscribe client] Subscribing to ' + event + ' at ' + path);
    firebase.child(path).on(event, handlers[event]);
    subscriptions[event][path] = true;
  }
}

function listenForSubscriptions() {
  for (var channel in redisToEvent) {
    subscribeClient.subscribe(channel);
  }
  subscribeClient.on('message', function(channel, message) {
    if (!redisToEvent[channel]) {
      throw new Error("Got message on unknown channel " + channel);
    }
    subscribe(redisToEvent[channel], message);
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
