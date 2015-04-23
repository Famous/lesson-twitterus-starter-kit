var FamousPlatform = require('famous');
var Famous = FamousPlatform.core.Famous;

function Twitterus(mount) {
    //attach app to the DOM
    this.context = Famous.createContext(mount || 'body');
    //create the root node of the app
    this.root = this.context.addChild();
    
    //call .addChild() on 'this.root' to add a child node
}

module.exports = Twitterus;
