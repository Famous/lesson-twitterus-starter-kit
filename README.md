## Twitterus Lesson Starter Kit - Step 1: Add Nodes

## Check out the full lesson here: 

[http://learn-staging.famo.us/lessons/twitterus/Layout.html](http://learn-staging.famo.us/lessons/twitterus/Layout.html)

=================================
_Excerpt from Step 1: Add Nodes_

## Layout

<span class="intro-graf">In this section, you'll learn about _components_ and how they interact with scene graph nodes to position the elements in an app. We'll teach you how to best organize these components and use them within your applications.</span>


In Famous, we do not position elements directly; instead, we position the nodes that _carry_ our elements. We encourage controlling the layout --size, positioning, alignment-- of nodes within parent classes.  Let's deconstruct the image from the previous slide to visualize how we will do this in Twitterus.

![BasicLayout](http://learn-staging.famo.us/lessons/twitterus/assets/images/MainLayout.png)

Looking at the image above, you will see that we need three nodes (circles) to carry the elements (rectangles) positioned at top, middle, and bottom of our Twitterus app. Let's create these nodes by calling `.addChild` three times on the root node in Twitterus: `this.root`. 

    var headerNode = this.root.addChild()
    var swapperNode = this.root.addChild()
    var footerNode = this.root.addChild()

<div class="sidenote--other"><p><strong>Modified files:</strong> <a href="https://github.famo.us/learn/lesson-twitterus-starter-kit/blob/step1/AddNodes/src/twitterus/Twitterus.js">Twitterus.js</a></p></div>

Now that we have three freshly created nodes, let's learn how to position them using _components_ so they match the layout representation on the right. 

======================================
All rights reserved. Famous Industries 2015
