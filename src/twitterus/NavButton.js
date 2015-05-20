var Node = require('famous/core/Node');
var DOMElement = require('famous/dom-renderables/DOMElement');

// The nav button class will show the name of a section
// and emit a click event when clicked
function NavButton (id, status) {
    // Subclass node
    Node.call(this);

    // make and style an element
    this.el = makeEl(this);

    // hold the id of the section
    // this NavButton points to.
    this.id = id;

    // set the content of the element
    // to the target section.
    this.el.setContent(id);

    this.addUIEvent('click');
}

NavButton.prototype = Object.create(Node.prototype);

// overwrite onReceive to respond to the changeSection event
NavButton.prototype.onReceive = function onReceive (event, payload) {
    if (event === 'changeSection') {
        // swap on/off depend if this button points
        // to the apps current section
        if (payload.to === this.getId()) this.on();
        else this.off();
    }
};

// apply the on class
NavButton.prototype.on = function on () {
    this.el.removeClass('off').addClass('on');
};

// apply the off class
NavButton.prototype.off = function off () {
    this.el.removeClass('on').addClass('off');
};

NavButton.prototype.getId = function getId () {
    return this.id;
};

// make and style an element
function makeEl (node) {
    return new DOMElement(node, {
        properties: {
            textAlign: 'center',
            lineHeight: '100px',
            fontSize: '18px',
            cursor: 'pointer'
        },
        classes: ['navigation']
    });
};

module.exports = NavButton;