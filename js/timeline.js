/* Timeline to view BSFC product metrics.*/

Timeline = function(_parentElement, _data, _eventHandler){
    
    this.parentElement = _parentElement;
    this.data = _data;
    this.eventHandler = _eventHandler;
    this.displayData = [];

    this.margin = {top: 20, right: 0, bottom: 30, left: 50},
    this.width = window.innerWidth - this.margin.left - this.margin.right,
    this.height = 300 - this.margin.top - this.margin.bottom;

    this.initVis();
}

Timeline.prototype.initVis = function(){

    var that = this;

    this.svg = this.parentElement.append("svg")
        .attr("width", this.width + this.margin.left + this.margin.right)
        .attr("height", this.height + this.margin.top + this.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    // creates axis and scales
    this.x = d3.time.scale()
      .range([0, this.width]);

    this.y = d3.scale.linear()
      .range([this.height, 0]);

    this.xAxis = d3.svg.axis()
      .scale(this.x)
      .orient("bottom");

    this.yAxis = d3.svg.axis()
      .scale(this.y)
      .orient("left");

    // initialize path
    this.area = d3.svg.area()
      .interpolate("basis")
      .x(function(d) { return that.x(d.time);})
      .y0(this.height)
      .y1(function(d) { return that.y(d.count);})

    this.dateFormatter = d3.time.format("%Y-%m-%d");

    /*this.line = d3.svg.line()
        .x(function(d) { return that.x(d.time); })
        .y(function(d) { return that.y(d.count); }); */

    // Add axes visual elements
    this.svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + this.height + ")")

    this.svg.append("g")
        .attr("class", "y axis")
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Units/sales");

    // filter, aggregate, modify data
    this.wrangleData(null);

    // call the up method
    this.updateVis();

}

Timeline.prototype.wrangleData= function(pass){

    var that = this;
    var filt_data;

    // if null, use all data, else filter
    if (pass!=null){
        if (pass.name=="All Items"){
            filt_data = this.data
        }
        else {
            filt_data = this.data.filter(function(d){
                if (d[pass.type]==pass.name){
                    return true
                }
                else {return false}
            })
        }
    }
    else {filt_data = this.data}

    // use that data to look at totals by day
    var nested_data = d3.nest().key(function(d){return d.new_date})
        .rollup(function(d){return d3.sum(d, function(g){return g.sold})})
        .entries(filt_data)

    // reformat date
    this.intData= nested_data.map(function(d){
        var res = {
            time: that.dateFormatter.parse(d.key),
            count: parseFloat(d.values)
        }

        return res;
    })

    // IMPT to sort by date for path to render correctly
    this.displayData = _.sortBy(this.intData, 'time' )

    console.log(this.displayData)
}

Timeline.prototype.updateVis = function(){

    var that = this;

    // from here down, adapted from CS171 section 6 
    this.x.domain(d3.extent(this.displayData, function(d) { return d.time; }));
    this.y.domain(d3.extent(this.displayData, function(d) { return d.count; }));

    console.log(d3.extent(this.displayData, function(d) { return d.time; }));

    // updates axis
    this.svg.select(".x.axis")
        .call(this.xAxis);

    this.svg.select(".y.axis")
        .transition().duration(750)
        .call(this.yAxis)

    // updates graph
    var path = this.svg.selectAll(".area")
    //var path = this.svg.selectAll(".line")
      .data([this.displayData])

    path.enter()
      .append("path")
      //.attr("class", "line")
      .attr("class", "area");

    path
        .attr("fill", "steelblue")
        .attr("stroke", "steelblue")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke-width", 1.5)
        .transition().duration(750)
        .attr("d", that.area)
        //.attr("d", that.line)

    // remove old objects
    path.exit()
      .remove();

}

Timeline.prototype.onZoomChange= function (pass){

    this.wrangleData(pass);

    this.updateVis();

}