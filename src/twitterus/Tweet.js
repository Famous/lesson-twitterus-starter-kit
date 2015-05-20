var Node = require('famous/core/Node');
var DOMElement = require('famous/dom-renderables/DOMElement');
var data = require('./Data');

// The tweet class that will render a particular tweet
function Tweet () {
    // subclass Node
    Node.call(this);

    // create a new DOMElement and style it.
    this.el = new DOMElement(this).setProperty('backgroundColor', getRandomColor())
                                  .setProperty('boxSizing', 'border-box')
                                  .setProperty('lineHeight', '100px')
                                  .setProperty('borderBottom', '1px solid black')
                                  .setProperty('font-size', '12px')
                                  .setContent(getRandomMessage());
}

// subclass Node
Tweet.prototype = Object.create(Node.prototype);

// Pick a random element from an array
function random (array) {
    return array[(Math.random() * array.length)|0];
}

// create Random message
function getRandomMessage () {
    return '<b>' + random(data.usernames) +
           ':</b>' + random(data.begin) + random(data.middle) + random(data.end) +
           ' ' + random(data.hashtags) + ' ' + random(data.hashtags);
}

// Create a random hex color
function getRandomColor() {
    // trick to create a range.
    return '#' + Array.apply(null, Array(6)).map(function (_, i) {
        return random('0123456789ABCDEF');
    }).join('');
}

module.exports = Tweet;