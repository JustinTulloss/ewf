var Firebase = require('firebase');
var redis = require('redis');

var redisConfig = {
  port: process.env.REDIS_PORT_6379_TCP_PORT || 6379,
  host: process.env.REDIS_PORT_6379_TCP_ADDR || 'localhost',
};

var fbUrl = process.env.FIREBASE_URL;
var firebase = new Firebase(fbUrl);
var subscribeClient = redis.createClient(redisConfig.port, redisConfig.host);
var publishClient = redis.createClient(redisConfig.port, redisConfig.host);

var SUBSCRIPTION_CHANNEL = 'firebase-subscriptions';

subscribeClient.on('error', function (err) {
  console.error("[redis subscribe client] " + err);
});

publishClient.on('error', function (err) {
  console.error("[redis publish client] " + err);
});

function path(fbRef) {
  return decodeURIComponent(fbRef.toString().replace(fbUrl, ''));
}

function onChange(ds) {
  console.info('[firebase] change occurred', path(ds.ref()));
  publishClient.publish(path(ds.ref()), JSON.stringify(ds.val()));
}

function subscribe(path) {
  firebase.child(path).on('value', onChange);
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

listenForSubscriptions();
