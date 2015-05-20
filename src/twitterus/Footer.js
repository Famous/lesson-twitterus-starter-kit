var data = require('./Data');
var NavButton = require('./NavButton');
var Node = require('famous/core/Node');

// the number of sections in the app
var numSections = data.sections.length;

// the footer will hold the nav buttons
function Footer () {
    // subclass Node
    Node.call(this);

    // object to store the buttons
    this.buttons = {};

    // for every section create a NavButton
    // and set its size and align
    data.sections.forEach(function (section, i) {
        this.buttons[section.id] = this.addChild(new NavButton(section.id))
                                       .setProportionalSize(1 / numSections)
                                       .setAlign(i / numSections);
    }.bind(this));
}

// subclass Node
Footer.prototype = Object.create(Node.prototype);

module.exports = Footer;