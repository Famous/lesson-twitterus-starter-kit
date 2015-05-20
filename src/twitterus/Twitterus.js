var Node = require('famous/core/Node');
var data = require('./Data');
var Header = require('./Header');
var Footer = require('./Footer');
var Swapper = require('./Swapper');

function Twitterus(mount) {
    // Extend Node
    Node.call(this);

    this.currentSection = data.sections[0].id;

    makeHeader(this);
    makeFooter(this);
    makeSwapper(this);
}

// Extend the prototype
Twitterus.prototype = Object.create(Node.prototype);

// Overwrite on mount to emit the changeSection event the moment
// twitter is added to the scene graph.
Twitterus.prototype.onMount = function onMount (parent, id) {
   Node.prototype.onMount.call(this, parent, id);
   this.emit('changeSection', {from: null, to: this.currentSection});
};

// Overwrite the onReceive method to intercept events flowing within 
// the scene graph
Twitterus.prototype.onReceive = function onReceive (event, payload) {

    // if the event is click then we know
    // that a NavButton was clicked
    // (NavButtons are the only element)
    // With the click event.
    if (event === 'click') {

        // get the id of the nav button
        var to = payload.node.getId();

        // emit the changeSection event to the subtree
        this.emit('changeSection', {
            from: this.currentSection,
            to: to
        });

        // set the current section
        this.currentSection = to;
    }
};

function makeHeader(node) {
    // the header will be positioned defaultly
    // along the top of its parent.
    // It will be the complete width of its parent
    // and 100 pixels tall.
    node.addChild()
        .setSizeMode('default', 'absolute')
        .setAbsoluteSize(null, 100)
        .addChild(new Header());
}

// make the swapper
function makeSwapper (node) {
    // the swapper will be 200 pixels smaller than
    // its parent in Y and otherwise the same size.
    // It will be position 100 pixels below its parent
    // such that it clears the header
    node.addChild()
        .setDifferentialSize(null, -200, null)
        .setPosition(0, 100)
        .addChild(new Swapper());
}

// make the footer
function makeFooter (node) {
    // the footer will be aligned
    // to the bottom of its parent.
    // Like the header it will be
    // 100px tall and the complete width.
    // note how we use MountPoint and Align
    // together to line up the bottom of the footer
    // with the bottom of the parent
    node.addChild()
        .setSizeMode('default', 'absolute')
        .setAbsoluteSize(null, 100)
        .setMountPoint(0, 1)
        .setAlign(0, 1)
        .addChild(new Footer());
}

module.exports = Twitterus;
