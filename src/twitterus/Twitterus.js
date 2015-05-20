var Node = require('famous/core/Node');
var data = require('./Data');
var Header = require('./Header');

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

function makeSwapper(node) {
    // the swapper will be 200 pixels smaller than
    // its parent in Y and otherwise the same size.
    // It will be position 100 pixels below its parent
    // such that it clears the header
    node.addChild()
        .setDifferentialSize(null, -200)
        .setPosition(0, 100)
        .addChild();
}

function makeFooter(node) {
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
        .addChild();
}

module.exports = Twitterus;
