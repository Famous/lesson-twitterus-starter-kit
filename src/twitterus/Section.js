var data = require('./Data');
var Node = require('famous/core/Node');
var DOMElement = require('famous/dom-renderables/DOMElement');
var Tweet = require('./Tweet');

function Section (i) {
    // subclass Node
    Node.call(this);

    // create and style a new DOMElement
    this.el = new DOMElement(this).setProperty('overflow-y', 'scroll')
                                  .setProperty('overflow-x', 'hidden');

    // create the tweets in the section.
    this.tweets = createTweets.call(this, i);
}

Section.prototype = Object.create(Node.prototype);

function createTweets (id) {
    var result = [];
    var numberOfTweets = data.sections[id].tweetNumber;

    // create an array of length equal to the number of tweets and then
    // map over it to create an array of tweets.
    return Array.apply(null, Array(numberOfTweets)).map(function (_, i) {
        // this node will be 100px tall and positioned after the previous one
        // in the array
        return this.addChild()
                   .setSizeMode('default', 'absolute')
                   .setAbsoluteSize(null, 100)
                   .setPosition(0, 100 * i)
                   .addChild(new Tweet());
    }.bind(this));
}

module.exports = Section;