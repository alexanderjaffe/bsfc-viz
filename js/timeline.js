/* Timeline to view BSFC product metrics.*/

Timeline = function(_parentElement, _data, _eventHandler){

    this.parentElement = _parentElement;
    this.data = _data;
    this.eventHandler = _eventHandler;
    this.displayData = [];

    this.margin = {top: 40, right: 50, bottom: 40, left: 50},
    this.width = window.innerWidth - this.margin.left - this.margin.right,
    this.height = window.innerHeight/3 - this.margin.top - this.margin.bottom;

    // define global filters
    this.previous_time_filter;
    this.previous_product_filter;
    // default to sold
    this.previous_type_filter = "sold";

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
    this.wrangleData(null, null, this.previous_type_filter);

    // call the up method
    this.updateVis();

}

Timeline.prototype.wrangleData= function(product, time, display_type){

    var that = this;
    var filt_data;

    // filter by time and product
    if (product !=null || time !=null){
        //filter by time first
        if (time != null){
            console.log(this.data)
            console.log(time.start)
            int_data = this.data.filter(function(d){
                if (that.df.parse(d.new_date) <= time.end && that.df.parse(d.new_date) >= time.start){
                    return true
                }
                else {return false}
            })
        }
        else {int_data = this.data}

        if (product == null || product.name == "All Items"){
            filt_data = int_data
        }
        else {
            // then filter by product
            // TODO NEEDS MORE SPECIFICITY
            filt_data = int_data.filter(function(d){
                if (d[product.type]==product.name){
                    return true
                }
                else {return false}})
        }
    }
    // if both null
    else {filt_data = this.data}

    console.log(filt_data)

    // calculate summary metrics
    var revenue = 0;
    var item_costs = 0;
    var units = 0;
    var pif_usage = 0;
    var spoilage = 0;
    var store_use = 0;
    var food_prep = 0;
    var comm_use = 0;
    var mem_disc = 0;
    var misc_disc = 0;

    filt_data.forEach(function(d){

        revenue += (d.sold - d.member_discount_applied - d.misc_discount_applied)*d.price;
        // unit differential
        cost = d.item_cost/100
        // take into account units from all sources
        item_costs += (d.sold + d.store_use + d.food_prep + d.committee + d.spoilage)*cost;
        units += d[display_type];
        // individual metrics
        store_use += d.store_use*cost
        spoilage += d.spoilage*cost
        comm_use += d.committee*cost
        food_prep += d.food_prep*cost
        // discounts
        pif_usage += Math.abs(d.pif_discount_applied)*d.price
        mem_disc += d.member_discount_applied*d.price
        misc_disc += d.misc_discount_applied*d.price
    })

    //send back to index, convert to $
    pass = {rev: revenue,cts:item_costs,uts:units,spo:spoilage,st:store_use,co:comm_use,fp:food_prep,pif:pif_usage, memb:mem_disc, misc:misc_disc}
    $(this.eventHandler).trigger("statsChanged", pass);

    // use that data to look at totals by day
    var nested_data = d3.nest().key(function(d){return d.new_date})
        .rollup(function(d){return d3.sum(d, function(g){return g[display_type]})})
        .entries(filt_data)

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

    // update global
    this.previous_product_filter = pass;
    this.wrangleData(pass, this.previous_time_filter, this.previous_type_filter);
    this.updateVis();

}

Timeline.prototype.onDateChange= function (pass){

    // update global
    this.previous_time_filter = pass;
    this.wrangleData(this.previous_product_filter, pass, this.previous_type_filter);
    this.updateVis();

}

Timeline.prototype.onTypeChange= function (pass){

    // update global
    this.previous_type_filter = pass;
    this.wrangleData(this.previous_product_filter, this.previous_time_filter, pass);
    this.updateVis();

}
