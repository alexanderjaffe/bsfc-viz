/* Timeselect to view BSFC product metrics.*/

Timeselect = function(_parentElement, _data, _eventHandler){

    this.parentElement = _parentElement;
    this.data = _data;
    this.displayData = [];
    this.eventHandler = _eventHandler;
    this.margin = {top: 2, right: 50, bottom: 30, left: 50},

    // boot up the viz
    this.initVis();

}

/* Method that sets up the SVG and the variables */
Timeselect.prototype.initVis = function(){

    var that = this;

    this.width = window.innerWidth - this.margin.left - this.margin.right,
    this.height = 50 - this.margin.top - this.margin.bottom;

    // add plotting space
    this.svg = this.parentElement.append("svg")
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom)
      .append("g")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")

      // creates axis and scales
    this.x = d3.time.scale()
      .range([0, this.width]);

    // to interpret input data
    this.df = d3.time.format("%Y-%m-%d");
    // to format interpreted date
    this.df2 = d3.time.format("%a %b %d %Y %H:%M:%S");

    this.brush = d3.svg.brush()
      .on("brush", function(){
        // initialize pass to send to other functions
        pass = {}
        if (that.brush.empty()){
            pass["start"] = that.date_range[0]
            pass["end"] = that.date_range[1]
        }
        else {
            pass["start"] = that.brush.extent()[0];
            pass["end"] = that.brush.extent()[1]
        }
        // trigger event
        $(that.eventHandler).trigger("dateChanged", pass)
      });

     this.svg.append("g")
        .attr("class","bounding-box")

     this.svg.append("g")
        .attr("class", "brush");

    // filter, aggregate, modify data
    this.wrangleData();

    // call the update method
    this.updateVis();
}

/* Wrassle the data.*/
Timeselect.prototype.wrangleData = function(){

    var that = this;

    this.displayData = this.data.map(function(d){return that.df.parse(d.new_date)})
    this.date_range = d3.extent(this.displayData)

}

/** the drawing function - should use the D3 selection, enter, exit*/
Timeselect.prototype.updateVis = function(){

    // bounding box
    this.svg.select(".bounding-box")
        .append("rect")
        .attr("height", this.height)
        .attr("width", this.width)
        .style("stroke", "darkgrey")
        .style("fill", "white")
    this.svg.select(".bounding-box")
        .append("text")
        .attr("y", this.height)
        .attr("dy", "1em")
        .text("select a date range")

    this.x.domain(this.date_range)

    this.brush.x(this.x);
    this.svg.select(".brush")
        .call(this.brush)
        .selectAll("rect")
        .attr("height", this.height)
        .style("fill", "darkgrey")
        .style("stroke", "darkgrey")

}
