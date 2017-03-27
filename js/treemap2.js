/* Treemap to view BSFC product metrics.*/

Treemap = function(_parentElement, _data, _eventHandler){
    
    this.parentElement = _parentElement;
    this.data = _data;
    this.displayData = [];
    this.eventHandler = _eventHandler;
    this.margin = {top: 20, right: 20, bottom: 20, left: 20},

    console.log("test")
    // boot up the viz
    this.initVis();

}

/* Method that sets up the SVG and the variables */
Treemap.prototype.initVis = function(){
    
    var that = this;

    this.rname = "TOP";
    this.format=d3.format(",d");
    this.title= "";
    theight = 36 + 16;
    this.width = window.innerWidth - this.margin.left - this.margin.right;
    this.height = window.innerHeight/2.5 - this.margin.top - this.margin.bottom;
    this.transitioning;
    
    // add plotting space
    this.svg = this.parentElement.append("svg")
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom)
      .append("g")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
      .style("shape-rendering", "crispEdges");

    // set scales
    this.color = d3.scale.category20c();
  
    this.x = d3.scale.linear()
      .domain([0, that.width])
      .range([0, that.width]);
  
    this.y = d3.scale.linear()
      .domain([0, that.height])
      .range([0, that.height]);
    
     this.treemap = d3.layout.treemap()
      .children(function(d, depth) { return depth ? null : d._children; })
      .sort(function(a, b) { return a.value - b.value; })
      .ratio(that.height / that.width * 0.5 * (1 + Math.sqrt(5)))
      .round(false);

    this.grandparent = this.svg.append("g")
      .attr("class", "grandparent");
  
    this.grandparent.append("rect")
      .attr("y", -that.margin.top)
      .attr("width", that.width)
      .attr("height", that.margin.top);
  
    this.grandparent.append("text")
      .attr("x", 6)
      .attr("y", 6 - that.margin.top)
      .attr("dy", ".75em");

    // filter, aggregate, modify data
    this.wrangleData();

}

/* Wrassle the data.*/
Treemap.prototype.wrangleData = function(_params){

    var that = this;

    /*var type = _params.dtype
    var start = _params.start
    var end = _params.end */
    var type = "sold"
    this.intData = []

    // filter the data on date
    /*this.filt_data = this.data.filter(function(d){

    })*/
    
    // create streamlined data object
    this.data.forEach(function(d){

        temp = {cat:d.new_cat, sub_cat: d.sub_cat, brand: d.brand, key: d.new_name, value:d[type]}
        that.intData.push(temp)
    })

    // make tree-like (nest) and collapse by date (rollup)
    this.arrayData = d3.nest().key(function(d){return d.cat})
        .key(function(d){return d.sub_cat}).key(function(d){return d.brand})
        .key(function(d){return d.key})
        .rollup(function(d){return d3.sum(d, function(g){return g.value})})
        .entries(that.intData);

    this.root = {key: this.rname, values: this.arrayData}
    
    this.dataready();

}

Treemap.prototype.initialize = function(root){
    
    root.x = root.y = 0;
    root.dx = this.width;
    root.dy = this.height;
    root.depth = 0;
}

Treemap.prototype.accumulate = function(d) {
    
    var that = this;

    return (d._children = d.children)
        ? d.value = d.children.reduce(function(p, v) { return p + that.accumulate(v); }, 0)
        : d.value;
  }

Treemap.prototype.layout = function(d) {
    
    var that = this;

    if (d._children) {
      that.treemap.nodes({_children: d._children});
      d._children.forEach(function(c) {
        c.x = d.x + c.x * d.dx;
        c.y = d.y + c.y * d.dy;
        c.dx *= d.dx;
        c.dy *= d.dy;
        c.parent = d;
        that.layout(c);
      });
    }
  }

Treemap.prototype.dataready = function(){
    
    this.initialize(this.root);
    this.accumulate(this.root);
    this.layout(this.root);
    this.display(this.root);
}

/** the drawing function - should use the D3 selection, enter, exit*/
Treemap.prototype.display = function(d){
    
    var that = this;

    this.grandparent
        .datum(d.parent)
        .on("click", that.transition)
        .select("text")
        .text(that.name(d));

    var g1 = this.svg.insert("g", ".grandparent")
        .datum(d)
        .attr("class", "depth");

    var g = g1.selectAll("g")
        .data(d._children)
        .enter().append("g");

    g.filter(function(d) { return d._children; })
        .classed("children", true)
        .on("click", that.transition);

    var children = g.selectAll(".child")
        .data(function(d) { return d._children || [d]; })
        .enter().append("g");

    children.append("rect")
        .attr("class", "child")
        .call(that.rect)
        .append("title")
        .text(function(d) { return d.key + " (" + that.format(d.value) + ")"; });
    
    children.append("text")
        .attr("class", "ctext")
        .text(function(d) { return d.key; })
        .call(that.text2);

    g.append("rect")
        .attr("class", "parent")
        .call(that.rect);

    var t = g.append("text")
        .attr("class", "ptext")
        .attr("dy", ".75em")

    t.append("tspan")
        .text(function(d) { return d.key; });
    
    t.append("tspan")
        .attr("dy", "1.0em")
        .text(function(d) { return that.format(d.value); });
    
    t.call(that.text);

    g.selectAll("rect")
        .style("fill", function(d) { return that.color(d.key); });

    return g;
}

Treemap.prototype.transition = function(d) {

    var that = this;

    if (this.transitioning || !d) return;
    this.transitioning = true;

    var g2 = this.display(d),
    t1 = g1.transition().duration(750),
    t2 = g2.transition().duration(750);

    // Update the domain only after entering new elements.
    this.x.domain([d.x, d.x + d.dx]);
    this.y.domain([d.y, d.y + d.dy]);

    // Enable anti-aliasing during the transition.
    this.svg.style("shape-rendering", null);

    // Draw child nodes on top of parent nodes.
    this.svg.selectAll(".depth").sort(function(a, b) { return a.depth - b.depth; });

    // Fade-in entering text.
    g2.selectAll("text").style("fill-opacity", 0);

    // Transition to the new view.
    t1.selectAll(".ptext").call(that.text).style("fill-opacity", 0);
    t1.selectAll(".ctext").call(that.text2).style("fill-opacity", 0);
    t2.selectAll(".ptext").call(that.text).style("fill-opacity", 1);
    t2.selectAll(".ctext").call(that.text2).style("fill-opacity", 1);
    t1.selectAll("rect").call(that.rect);
    t2.selectAll("rect").call(that.rect);

    // Remove the old node when the transition is finished.
    t1.remove().each("end", function() {
    this.svg.style("shape-rendering", "crispEdges");
    this.transitioning = false;
    });
}

Treemap.prototype.text = function(text) {
    
    var that = this;

    text.selectAll("tspan")
        .attr("x", function(d) { return that.x(d.x) + 6; })
    text.attr("x", function(d) { return that.x(d.x) + 6; })
        .attr("y", function(d) { return that.y(d.y) + 6; })
        .style("opacity", function(d) { return this.getComputedTextLength() < that.x(d.x + d.dx) - that.x(d.x) ? 1 : 0; });
}

Treemap.prototype.text2 = function (text) {
    
    var that = this;

    text.attr("x", function(d) { return that.x(d.x + d.dx) - this.getComputedTextLength() - 6; })
        .attr("y", function(d) { return that.y(d.y + d.dy) - 6; })
        .style("opacity", function(d) { return this.getComputedTextLength() < that.x(d.x + d.dx) - that.x(d.x) ? 1 : 0; });
}

Treemap.prototype.rect = function(rect) {
    
    rect.attr("x", function(d) { return that.x(d.x); })
        .attr("y", function(d) { return that.y(d.y); })
        .attr("width", function(d) { return that.x(d.x + d.dx) - that.x(d.x); })
        .attr("height", function(d) { return that.y(d.y + d.dy) - that.y(d.y); });
}

Treemap.prototype.name = function (d) {
    
    var that = this;
    return d.parent
        ? that.name(d.parent) + " / " + d.key + " (" + that.format(d.value) + ")"
        : d.key + " (" + that.format(d.value) + ")";
}

/* Define behavior on user input.*/
Treemap.prototype.onSelectionChange= function(pass){

}
