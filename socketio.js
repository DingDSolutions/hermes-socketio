'use strict';

const socketio = require('socket.io');
const HermesMessage = require('hermesjs-message');

function init (settings) {
  return function (hermes) {
    return new HermesSocketIO(settings, hermes);
  };
}

function HermesSocketIO (settings, hermes) {
  this.hermes = hermes;
  this.server_settings = settings;
}

HermesSocketIO.prototype.listen = function listen () {
  this.setup();
  if (this.http_server.listen) {
    this.server = this.http_server.listen(this.server_settings.port || 80);
  } else {
    this.server = this.http_server(this.server_settings.port || 80);
  }
  return this.server;
};

HermesSocketIO.prototype.setup = function setup () {
  this.http_server = this.server_settings.http_server;
  if (!this.http_server) {
    this.io = socketio();
  } else {
    this.io = socketio(this.http_server);
  }

  this.io.on('connection', (socket) => {
    this.hermes.emit('client:ready', { name: 'Socket.IO adapter' });
    socket.onevent = (packet) => {
      const topic = packet.data[0];
      this.published(this.createMessageFromClient(topic, packet, socket));
    };
  });
};

HermesSocketIO.prototype.published = function published (message) {
  this.hermes.emit('client:message', message);
};

HermesSocketIO.prototype.createMessage = function createMessage (topic, message) {
  return {
    protocol: message.protocol || this.server_settings.protocol || 'ws',
    payload: message.payload,
    topic,
    headers: message.headers
  };
};

HermesSocketIO.prototype.createMessageFromClient = function createMessageFromClient (topic, packet, client) {
  const message = new HermesMessage({
    protocol: 'ws',
    payload: packet.data[1],
    topic,
    headers: {},
    connection: client,
    original_packet: packet
  });

  message.on('send', this.send.bind(this, message));

  return message;
};

HermesSocketIO.prototype.send = function send (message) {
  this.io.emit(message.topic, this.createMessage(this, message.topic, message));
};

module.exports = init;
