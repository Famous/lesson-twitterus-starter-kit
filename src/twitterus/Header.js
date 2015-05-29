var Node = require('famous/core/Node');
var DOMElement = require('famous/dom-renderables/DOMElement');
var Align = require('famous/components/Align');

function Header () {
    Node.call(this);
    this.el = new DOMElement(this, {
        classes: ['header'],
        properties: {
          'background-color': 'blue'
        }
    });
   console.log(this)
    this.title = this.addChild();
    this.titleEl = new DOMElement(this.title).setProperty('textAlign', 'center')
                                             .setProperty('lineHeight', '100px')
                                             .setProperty('fontSize', '30px');

    this.titlePosition = new Align(this.title);
}

Header.prototype = Object.create(Node.prototype);

module.exports = Header;