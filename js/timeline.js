/* Timeline to view BSFC product metrics.*/

Timeline = function(_parentElement, _data, _eventHandler){
    
    this.parentElement = _parentElement;
    this.data = _data;
    this.eventHandler = _eventHandler;
    this.displayData = [];

    this.margin = {top: 40, right: 50, bottom: 40, left: 50},
    this.width = window.innerWidth - this.margin.left - this.margin.right,
    this.height = window.innerHeight/3 - this.margin.top - this.margin.bottom;

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
      .interpolate("monotone")
      .x(function(d) { return that.x(d.time);})
      .y0(this.height)
      .y1(function(d) { return that.y(d.count);})

    // to interpret input data
    this.df = d3.time.format("%Y-%m-%d");
    // to format interpreted date
    this.df2 = d3.time.format("%a %b %d %Y %H:%M:%S");

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

    console.log(pass);
    
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

    // calculate summary metrics
    var revenue = 0;
    var costs = 0;
    var units = 0;

    filt_data.forEach(function(d){
        revenue += d.sold*d.price;
        costs += d.sold*d.item_cost;
        units += d.sold;
    })

    //send back to index, convert to $
    pass = {rev: revenue/100, cts: costs/100, uts:units}
    $(this.eventHandler).trigger("statsChanged", pass);

    // use that data to look at totals by day
    var nested_data = d3.nest().key(function(d){return d.new_date})
        .rollup(function(d){return d3.sum(d, function(g){return g.sold})})
        .entries(filt_data)


    test = _.sortBy(filt_data, 'price' )
    console.log(test.reverse()[0])

    // reformat date
    this.intData= nested_data.map(function(d){

        var res = {
            // interpret data and recast
            time: that.df2(that.df.parse(d.key)),
            count: parseFloat(d.values)
        }

        return res;
    })

    // zero the data - ie, there's a point for every day
    // generate date range
    var drange = d3.time.day.range(d3.min(that.intData, function(d){return that.df2.parse(d.time)}), d3.max(that.intData, function(d){return that.df2.parse(d.time)}))
    var zeroes = {}
    // initialize each datum to 0
    drange.forEach(function(d){zeroes[(that.df2(d))] = 0})

    // fill in actual counts
    this.intData.forEach(function(d){
        zeroes[d.time] = d.count
    })

    // turn into list
    zeroed = []
    for (key in zeroes){
        zeroed.push({time:that.df2.parse(key), count: zeroes[key]})
    }

    // IMPT to sort by date for path to render correctly
    this.displayData = _.sortBy(zeroed, 'time' )

}

Timeline.prototype.updateVis = function(){

    var that = this;

    // from here down, adapted from CS171 section 6 
    this.x.domain(d3.extent(this.displayData, function(d) { return d.time; }));
    this.y.domain(d3.extent(this.displayData, function(d) { return d.count; }));

    //console.log(d3.extent(this.displayData, function(d) { return d.time; }));

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

    // points
    var points = this.svg.selectAll(".point")
        .data(this.displayData)

    points.enter()
        .append("svg:circle")
        .attr("class", "point")

    points
        .attr("stroke", "black")
        .attr("fill", "black")
        .transition().duration(750)
        .attr("cx", function(d){return that.x(d.time)})
        .attr("cy", function(d){return that.y(d.count)})
        .attr("r", 1.5)

    points.exit().remove()

}

Timeline.prototype.onZoomChange= function (pass){

    this.wrangleData(pass);

    this.updateVis();

}