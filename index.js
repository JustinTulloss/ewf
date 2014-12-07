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

var ACTION_CHANNEL = 'firebase.action';
var EVENT_CHANNEL = 'firebase.event';

// The set of current subscribed paths
var subscriptions = {};

function path(fbRef) {
  return decodeURIComponent(fbRef.toString().replace(fbUrl, ''));
}

function onChange(event, ds) {
  console.info('[firebase] change occurred', path(ds.ref()));
  publishClient.publish(event + ':' + path(ds.ref()), JSON.stringify(ds.val()));
}

var handlers = {};
function subscribe(event, path) {
  subscriptions[event] = subscriptions[event] || {};
  if (!subscriptions[event][path]) {
    console.info('[redis subscribe client] Subscribing to ' + event + ' at ' + path);
    handlers[event] = onChange.bind(null, event);
    firebase.child(path).on(event, handlers[event]);
    subscriptions[event][path] = 1;
  } else {
    subscriptions[event][path]++;
  }
}

function writeToFirebase(args) {
  var path = args.path;
  if (!args.path) {
    throw new Error("A path was not defined for firebase operation:", args);
  }
  var method = args.method;
  if (!args.method) {
    throw new Error("A method was not defined for firebase operation:", args);
  }
  var ref = firebase.child(path);
  if (!ref[method]) {
    throw new Error("Method %s does not exist!", method);
  }
  ref[method].apply(ref, args.arguments);
}

function listenForSubscriptions() {
  subscribeClient.subscribe(ACTION_CHANNEL, EVENT_CHANNEL);
  subscribeClient.on('message', function(channel, payload) {
    var msg = JSON.parse(payload);
    switch (channel) {
      case ACTION_CHANNEL:
        writeToFirebase(msg);
        break;
      case EVENT_CHANNEL:
        subscribe(msg.event, msg.path);
        break;
      default:
        console.error("Received message on unknown channel:", channel);
    }
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
