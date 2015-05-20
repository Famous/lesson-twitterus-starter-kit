var data = require('./Data');
var Section = require('./Section');
var Node = require('famous/core/Node');
var Align = require('famous/components/Align');
var DOMElement = require('famous/dom-renderables/DOMElement');

// The swapper will hold the sections and swap between them
// on events
function Swapper () {
    // subclass Node
    Node.call(this);

    // create a new dom element 
    this.el = new DOMElement(this);

    // store the current section
    this.currentSection = null;

    // create the sections
    this.sections = createSections.call(this);
}

// subclass Node
Swapper.prototype = Object.create(Node.prototype);

Swapper.prototype.changeSection = function changeSection (to) {
    // Swap out any section that isn't the new section
    // and swap in the new section
    data.sections.forEach(function (section) {
        if (section.id === to) 
            // 500 millisecond transition
            this.sections[section.id].align.set(0, 0, 0, {
                duration: 500
            });
        else
            // 1 in x will put the top left corner of the 
            // section directly off the screen
            this.sections[section.id].align.set(1, 0, 0, {
                duration: 500
            });
    }.bind(this));

    this.currentSection = to;
};

// overwrite onReceive to intercept events in the scene graph
Swapper.prototype.onReceive = function onReceive (event, payload) {
    if (event === 'changeSection') this.changeSection(payload.to);
};

function createSections () {
    var result = {};

    // iterate over all the sections in our data
    data.sections.forEach(function (section, i) {
        var child = this.addChild();
        result[section.id] = {
            align: new Align(child),
            section: child.addChild(new Section(i))
        }
    }.bind(this));

    return result;
}

module.exports = Swapper;