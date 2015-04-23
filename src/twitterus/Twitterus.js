var FamousPlatform = require('famous');
var Famous = FamousPlatform.core.Famous;

function Twitterus(mount) {
    this.context = Famous.createContext(mount || 'body');
    this.root = this.context.addChild();
    
    //add three child nodes extending frmo the root node
    var headerNode = this.root.addChild()
    var swapperNode = this.root.addChild()
    var footerNode = this.root.addChild()
}

module.exports = Twitterus;
