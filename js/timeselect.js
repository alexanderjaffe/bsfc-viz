/* Timeselect to view BSFC product metrics.*/

Timeselect = function(_parentElement, _data, _eventHandler){
    
    this.parentElement = _parentElement;
    this.data = _data;
    this.displayData = [];
    this.eventHandler = _eventHandler;
    this.margin = {top: 75, right: 20, bottom: 10, left: 100},

    // boot up the viz
    this.initVis();

}

/* Method that sets up the SVG and the variables */
Timeselect.prototype.initVis = function(){
    
    var that = this;

    this.width = window.innerWidth - this.margin.right - 100 ;
    //this.width = this.cellSize*this.col_number, // - margin.left - margin.right,
    this.height = window.innerHeight/2.5 // - margin.top - margin.bottom,
    
    // add plotting space
    this.svg = this.parentElement.append("svg")
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom)
      .append("g")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    // filter, aggregate, modify data
    this.wrangleData();

    // call the update method
    this.updateVis();
}

/* Wrassle the data.*/
Timeselect.prototype.wrangleData = function(){

    // displayData should hold the data which is visualized
   this.displayData = this.data
    
    /*this.displayData = this.intData.filter(function(d){
        if (d.col > 400){return false}
            else {return true}
    }) */

    console.log(this.displayData)

}

/** the drawing function - should use the D3 selection, enter, exit*/
Timeselect.prototype.updateVis = function(){

    var that = this;

}

/* Define behavior on user input.*/
Timeselect.prototype.onSelectionChange= function(pass){

    // unpack passed object
    type = pass["type"]

    // call relevant function
    if (type=="order"){this.order(pass["value"])}
    else if (type == "data_type"){this.colorize(pass["value"])}

}
