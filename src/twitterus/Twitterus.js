var Node = require('famous/core/Node');

function Twitterus(mount) {
    // Extend Node
    Node.call(this);
}

// Extend the prototype
Twitterus.prototype = Object.create(Node.prototype);

module.exports = Twitterus;
