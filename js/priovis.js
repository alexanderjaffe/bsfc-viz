/**
 * Created by Hendrik Strobelt (hendrik.strobelt.com) on 1/28/15.
 */

/*
 *
 * ======================================================
 * We follow the vis template of init - wrangle - update
 * ======================================================
 *
 * */

/**
 * AgeVis object for HW3 of CS171
 * @param _parentElement -- the HTML or SVG element (D3 node) to which to attach the vis
 * @param _data -- the data array
 * @param _metaData -- the meta-data / data description object
 * @constructor
 */
PrioVis = function(_parentElement, _data, _metaData, mode_id){
    this.parentElement = _parentElement;
    this.data = _data;
    this.metaData = _metaData;
    this.displayData = [];
    this.mode_id = mode_id;

    // from cs171 section 6
    this.margin = {top: 20, right: 0, bottom: 20, left: 50},
    this.width = 650 - this.margin.left - this.margin.right,
    this.height = 440 - this.margin.top - this.margin.bottom;

    this.initVis();

}


/**
 * Method that sets up the SVG and the variables
 */

// global mode tracker
var themode;

PrioVis.prototype.initVis = function(){

    //get mode and save out
    themode = this.mode_id;

    // from here down, adapted from CS171 section 6 
    var that = this;

    // constructs SVG layout
    this.svg = this.parentElement.append("svg")
        .attr("width", this.width + this.margin.left + this.margin.right)
        .attr("height", this.height + this.margin.top + this.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

  // creates axis and scales
    this.x = d3.scale.ordinal()
      .rangeRoundBands([0, this.width], .1);

    this.y = d3.scale.linear()
      .range([this.height/2,0]);

    this.yAxis = d3.svg.axis()
      .scale(this.y)
      .orient("left");

    this.xAxis = d3.svg.axis()
      .scale(this.x)
      .ticks(0)
      .orient("bottom")

    // Add axes visual elements
    this.svg.append("g")
        .attr("class", "y axis")
      	.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("x", -6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text(function(){
        	if (themode=="avg"){return "% Priority Difference"}
        	else {return "Priority Count"}
        });

    this.svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + this.height/2 + ")")

    // filter, aggregate, modify data
    this.wrangleData(null);

    // call the update method
    this.updateVis();

}


/**
 * Method to wrangle the data. In this case it takes an options object
 * @param _filterFunction - a function that filters data or "null" if none
 */
PrioVis.prototype.wrangleData= function(_filterFunction){

    // displayData should hold the data which is visualized
    this.displayData = this.filterAndAggregate(_filterFunction);

    //// you might be able to pass some options,
    //// if you don't pass options -- set the default options
    //// the default is: var options = {filter: function(){return true;} }
    //var options = _options || {filter: function(){return true;}};

}



/**
 * the drawing function - should use the D3 selection, enter, exit
 */
PrioVis.prototype.updateVis = function(){

    // Dear JS hipster,
    // you might be able to pass some options as parameter _option
    // But it's not needed to solve the task.
    // var options = _options || {};

    var that = this;

    // set domain based on mode
    if (themode == "default"){
    	this.y.domain([0, d3.max(this.displayData)]);}
    else {
    	// allows 0 to always be in the middle
    	// help from http://stackoverflow.com/questions/10127402/bar-chart-with-negative-values
    	// calculate max value by magnitude
    	var bound = Math.max(Math.abs(d3.min(this.displayData)), Math.abs(d3.max(this.displayData)));
    	this.y.domain([-bound,bound]);}
    this.x.domain(d3.range(16))

    this.svg.select(".y.axis")
        .call(this.yAxis)
    
    // x axis only for avg mode
    if (themode == "avg"){
	    this.svg.select(".x.axis")
	    	.attr("transform", "translate(0," + that.height/4+")")
	        .call(this.xAxis)
			.selectAll("text").remove();
	}

    // from here down, adapted from CS171 section 6 
    // updates graph
    // Data join
    var bar = this.svg.selectAll(".bar")
      .data(this.displayData, function(d){return d})

    // Append new bar groups, if required
    var bar_enter = bar.enter().append("g");

    // Append a rect and a text only for the Enter set (new g)
    bar_enter.append("rect");
    bar_enter.append("text");

    // Add attributes (position) to all bars
    bar
      .attr("class", "bar")
      .attr("transform", function(d, i) {return "translate(" + that.x(i) + ",0)"; })

    // Remove the extra bars
    bar.exit()
      .remove();

    // Update all inner rects and texts (both update and enter sets)

    bar.select("rect")
      .attr("x", 0)
      .attr("y", function(d,i){
		// y based on mode
		if (themode=="avg"){return that.y(Math.max(0,d))} 
      	else {return that.y(d)}
      })
      .attr("width", 30)
      .style("fill", function(d,i) {
      	// color based on mode
      	if (themode == "avg"){
      		if (d < 0){return "red"}
      		else {return "green"}
      	}
        else {return that.metaData.priorities[i]["item-color"]}
      })
      .attr("height", function(d, i) {
          // height based on mode
          if (themode == "avg"){
          	return Math.abs(that.height/4 - that.y(d));
          }
          else {return that.height/2 - that.y(d);}
      });

    bar.select("text")
      .attr("x", -200)
      .attr("y", 55)
      .text(function(d,i) { 
        return that.metaData.priorities[i]["item-title"]
  		})
      .attr("class", "type-label")
      .attr("dy", "0em")
      .attr("font-size", 10)
      .attr("text-anchor", "end")
      .attr("transform", "rotate(-80)")
}


/**
 * Gets called by event handler and should create new aggregated data
 * aggregation is done by the function "aggregate(filter)". Filter has to
 * be defined here.
 * @param selection
 */
PrioVis.prototype.onSelectionChange = function (pass){

    // unpack passed object
    start = pass["start"];
    end = pass["end"];

    // generate custom filter from extent
    var time_filter = function(d){
        return (d.time <= end && d.time >= start)
    }

    this.wrangleData(time_filter);

    this.updateVis();
}


/*
*
* ==================================
* From here on only HELPER functions
* ==================================
*
* */



/**
 * The aggregate function that creates the counts for each age for a given filter.
 * @param _filter - A filter can be, e.g.,  a function that is only true for data of a given time range
 * @returns {Array|*}
 */

//store average percentage data as global 
// not recalculated each time
var avg_data;

PrioVis.prototype.filterAndAggregate = function(_filter){

    // Set filter to a function that accepts all items
    // ONLY if the parameter _filter is NOT null use this parameter
    var filter = function(){return true;}
    if (_filter != null){
        filter = _filter;
    }

    var that = this;

    // create an array of values for age 0-100
    var res = d3.range(16).map(function () {
        return 0;
    });

    // accumulate all values that fulfill the filter criterion
    // implement the function that filters the data and sums the values

    newData = this.data.filter(filter);

    newData.map(function(k){
        k.prios.map(function(l,i){
            res[i] += l;
        })
    })

    // calculate averages for all data - one time on initialization for avg mode
    if (themode == "avg" && _filter == null){

    	var total = 0;
    	// calculate total number of votes
    	res.map(function(d){total += d;})
    	
    	// calculate average percentage for each priority
    	avg_data = res.map(function(d){return d/total*100})
    }

    // turn into percent difference for avg mode
    if (themode == "avg"){
    	var total2 = 0;
    	// calculate total number of votes
    	res.map(function(d){total2 += d;})
    	// calculate average percentage for each priority
    	var selection_avg_data = res.map(function(d){return d/total2*100})

    	// derive data - difference btwn selection and average
		derived =[];
		for(i=0;i<res.length;i++){
		   temp=selection_avg_data[i]-avg_data[i];
		   derived.push(temp);
		};

		res = derived;
    }

    return res;

}




