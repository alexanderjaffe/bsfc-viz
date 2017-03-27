/* Treemap to view BSFC product metrics.*/

Treemap = function(_parentElement, _data, _eventHandler){
    
    this.parentElement = _parentElement;
    this.data = _data;
    this.displayData = [];
    this.eventHandler = _eventHandler;
    this.margin = {top: 20, right: 20, bottom: 20, left: 20},

    // boot up the viz
    this.wrangleData();
    //this.initVis();

}

Treemap.prototype.wrangleData = function(){
  
  var that = this;
  
  // nest the data and combine across dates        
  var data_nest = d3.nest().key(function(d){return d.new_cat})
    .key(function(d){return d.sub_cat}).key(function(d){return d.brand})
    .key(function(d){return d.key})
    .rollup(function(d){return d3.sum(d, function(g){return g.value})})
    .entries(that.data)

  // change leaf-level node attribute values -> value
  function recurse(object) {
    if (!isNaN(object.values)){temp = object.values; delete object.values; object["value"] = temp;}
      else {object.values.forEach(function(d){recurse(d)})}
  }

  data_nest.forEach(function(d){recurse(d)});

  // change leveling for produce w/ no brand/subcat
  // try to replace with a recursive
  data_nest.forEach(function(d){
    if (d.key == "Produce"){
      var index;
      d.values.forEach(function(k){
        if (k.key == "Other"){
          index = d.values.indexOf(k)
          console.log(index)
          k.values.forEach(function(j){
            j.values.forEach(function(l){
              d.values.push(l)})})}})
      d.values.splice(index, 1)}})

  this.root = {key: "All Items", values: data_nest};
  this.title = {title: "BSFC sales data"};
  //that.main({title: "BSFC sales data"}, {key: "All Items", values: data_nest});
  that.initVis()

}

/* Method that sets up the SVG and the variables */
Treemap.prototype.initVis =  function () {

  o = this.title;
  var that = this;
  data = this.root;

  margin = {top: 24, right: 0, bottom: 0, left: 0},
    rootname =  "TOP",
    format =  ".0f",
    title = "",
  width = 960,
  height =500,
    formatNumber = d3.format(format),
    rname = rootname,
    theight = 36 + 16

  //$('#chart').width(width).height(height);
  this.width = width - margin.left - margin.right,
  this.height = height - margin.top - margin.bottom - theight,
  this.transitioning;
  
  this.color = d3.scale.category20c();
  
  this.x = d3.scale.linear()
      .domain([0, width])
      .range([0, width]);
  
  this.y = d3.scale.linear()
      .domain([0, height])
      .range([0, height]);
  
  this.treemap = d3.layout.treemap()
      .children(function(d, depth) { return depth ? null : d._children; })
      .sort(function(a, b) { return a.value - b.value; })
      .ratio(that.height / that.width * 0.5 * (1 + Math.sqrt(5)))
      .round(false);

  this.svg = d3.select("#catVis").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.bottom + margin.top)
      .style("margin-left", -margin.left + "px")
      .style("margin.right", -margin.right + "px")
    .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .style("shape-rendering", "crispEdges");
  
  this.grandparent = this.svg.append("g")
      .attr("class", "grandparent");
  
  this.grandparent.append("rect")
      .attr("y", -margin.top)
      .attr("width", width)
      .attr("height", margin.top);
  
  this.grandparent.append("text")
      .attr("x", 6)
      .attr("y", 6 - margin.top)
      .attr("dy", ".75em");

  /*if (data instanceof Array) {
    root = { key: rname, values: data };
  } else {
    root = data;
  } */

  this.next();
}

Treemap.prototype.next = function(){
  
  var that = this;
  root = this.root
    
  initialize(root);
  accumulate(root);
  layout(root);
  console.log(root);
  display(root);

  /*if (window.parent !== window) {
    var myheight = document.documentElement.scrollHeight || document.body.scrollHeight;
    window.parent.postMessage({height: myheight}, '*');
  } */

  function initialize(root) {
    root.x = root.y = 0;
    root.dx = that.width;
    root.dy = that.height;
    root.depth = 0;
  }

  // Aggregate the values for internal nodes. This is normally done by the
  // treemap layout, but not here because of our custom implementation.
  // We also take a snapshot of the original children (_children) to avoid
  // the children being overwritten when when layout is computed.
  function accumulate(d) {
    return (d._children = d.values)
        ? d.value = d.values.reduce(function(p, v) { return p + accumulate(v); }, 0)
        : d.value;
  }

  // Compute the treemap layout recursively such that each group of siblings
  // uses the same size (1×1) rather than the dimensions of the parent cell.
  // This optimizes the layout for the current zoom state. Note that a wrapper
  // object is created for the parent node for each group of siblings so that
  // the parent’s dimensions are not discarded as we recurse. Since each group
  // of sibling was laid out in 1×1, we must rescale to fit using absolute
  // coordinates. This lets us use a viewport to zoom.
  function layout(d) {
    if (d._children) {
      that.treemap.nodes({_children: d._children});
      d._children.forEach(function(c) {
        c.x = d.x + c.x * d.dx;
        c.y = d.y + c.y * d.dy;
        c.dx *= d.dx;
        c.dy *= d.dy;
        c.parent = d;
        layout(c);
      });
    }
  }

  function display(d) {
    that.grandparent
        .datum(d.parent)
        .on("click", transition)
      .select("text")
        .text(name(d));

    var g1 = that.svg.insert("g", ".grandparent")
        .datum(d)
        .attr("class", "depth");

    var g = g1.selectAll("g")
        .data(d._children)
      .enter().append("g");

    g.filter(function(d) { return d._children; })
        .classed("children", true)
        .on("click", transition);

    var children = g.selectAll(".child")
        .data(function(d) { return d._children || [d]; })
      .enter().append("g");

    children.append("rect")
        .attr("class", "child")
        .call(rect)
      .append("title")
        .text(function(d) { return d.key + " (" + formatNumber(d.value) + ")"; });
    children.append("text")
        .attr("class", "ctext")
        .text(function(d) { return d.key; })
        .call(text2);

    g.append("rect")
        .attr("class", "parent")
        .call(rect);

    var t = g.append("text")
        .attr("class", "ptext")
        .attr("dy", ".75em")

    t.append("tspan")
        .text(function(d) { return d.key; });
    t.append("tspan")
        .attr("dy", "1.0em")
        .text(function(d) { return formatNumber(d.value); });
    t.call(text);

    g.selectAll("rect")
        .style("fill", function(d) { return that.color(d.key); });

    function transition(d) {
      if (that.transitioning || !d) return;
      that.transitioning = true;

      var g2 = display(d),
          t1 = g1.transition().duration(750),
          t2 = g2.transition().duration(750);

      // Update the domain only after entering new elements.
      that.x.domain([d.x, d.x + d.dx]);
      that.y.domain([d.y, d.y + d.dy]);

      // Enable anti-aliasing during the transition.
      that.svg.style("shape-rendering", null);

      // Draw child nodes on top of parent nodes.
      that.svg.selectAll(".depth").sort(function(a, b) { return a.depth - b.depth; });

      // Fade-in entering text.
      g2.selectAll("text").style("fill-opacity", 0);

      // Transition to the new view.
      t1.selectAll(".ptext").call(text).style("fill-opacity", 0);
      t1.selectAll(".ctext").call(text2).style("fill-opacity", 0);
      t2.selectAll(".ptext").call(text).style("fill-opacity", 1);
      t2.selectAll(".ctext").call(text2).style("fill-opacity", 1);
      t1.selectAll("rect").call(rect);
      t2.selectAll("rect").call(rect);

      // Remove the old node when the transition is finished.
      t1.remove().each("end", function() {
        that.svg.style("shape-rendering", "crispEdges");
        that.transitioning = false;
      });
    }

    return g;
  }

  function text(text) {
    text.selectAll("tspan")
        .attr("x", function(d) { return that.x(d.x) + 6; })
    text.attr("x", function(d) { return that.x(d.x) + 6; })
        .attr("y", function(d) { return that.y(d.y) + 6; })
        .style("opacity", function(d) { return this.getComputedTextLength() < that.x(d.x + d.dx) - that.x(d.x) ? 1 : 0; });
  }

  function text2(text) {
    text.attr("x", function(d) { return that.x(d.x + d.dx) - this.getComputedTextLength() - 6; })
        .attr("y", function(d) { return that.y(d.y + d.dy) - 6; })
        .style("opacity", function(d) { return this.getComputedTextLength() < that.x(d.x + d.dx) - that.x(d.x) ? 1 : 0; });
  }

  function rect(rect) {
    rect.attr("x", function(d) { return that.x(d.x); })
        .attr("y", function(d) { return that.y(d.y); })
        .attr("width", function(d) { return that.x(d.x + d.dx) - that.x(d.x); })
        .attr("height", function(d) { return that.y(d.y + d.dy) - that.y(d.y); });
  }

  function name(d) {
    return d.parent
        ? name(d.parent) + " / " + d.key + " (" + formatNumber(d.value) + ")"
        : d.key + " (" + formatNumber(d.value) + ")";
  }

}
