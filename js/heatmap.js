
HeatMap = function(_parentElement, _data, _metaData, _eventHandler){
    
    this.parentElement = _parentElement;
    this.data = _data;
    this.metaData = _metaData;
    this.displayData = [];
    this.eventHandler = _eventHandler;
    this.margin = {top: 20, right: 20, bottom: 20, left: 20},
    /* this.width = 1000 - this.margin.left - this.margin.right,
    this.height = 800 - this.margin.top - this.margin.bottom; */

    this.initVis();

}

/* Method that sets up the SVG and the variables */
HeatMap.prototype.initVis = function(){
    
    var that = this;

    this.cellSize=12;
    this.col_number=60;
    this.row_number=50;
    this.width = this.cellSize*this.col_number, // - margin.left - margin.right,
    this.height = this.cellSize*this.row_number , // - margin.top - margin.bottom,
    //gridSize = Math.floor(width / 24),
    this.legendElementWidth = this.cellSize*2.5,
    this.colorBuckets = 21,
    this.colors = ['#005824','#1A693B','#347B53','#4F8D6B','#699F83','#83B09B','#9EC2B3','#B8D4CB','#D2E6E3','#EDF8FB','#FFFFFF','#F1EEF6','#E6D3E1','#DBB9CD','#D19EB9','#C684A4','#BB6990','#B14F7C','#A63467','#9B1A53','#91003F'];
    this.hcrow = [49,11,30,4,18,6,12,20,19,33,32,26,44,35,38,3,23,41,22,10,2,15,16,36,8,25,29,7,27,34,48,31,45,43,14,9,39,1,37,47,42,21,40,5,28,46,50,17,24,13], // change to gene name or probe id
    this.hccol = [6,5,41,12,42,21,58,56,14,16,43,15,17,46,47,48,54,49,37,38,25,22,7,8,2,45,9,20,24,44,23,19,13,40,11,1,39,53,10,52,3,26,27,60,50,51,59,18,31,32,30,4,55,28,29,57,36,34,33,35], // change to gene name or probe id
    this.rowLabel = ['1759080_s_at','1759302_s_at','1759502_s_at','1759540_s_at','1759781_s_at','1759828_s_at','1759829_s_at','1759906_s_at','1760088_s_at','1760164_s_at','1760453_s_at','1760516_s_at','1760594_s_at','1760894_s_at','1760951_s_at','1761030_s_at','1761128_at','1761145_s_at','1761160_s_at','1761189_s_at','1761222_s_at','1761245_s_at','1761277_s_at','1761434_s_at','1761553_s_at','1761620_s_at','1761873_s_at','1761884_s_at','1761944_s_at','1762105_s_at','1762118_s_at','1762151_s_at','1762388_s_at','1762401_s_at','1762633_s_at','1762701_s_at','1762787_s_at','1762819_s_at','1762880_s_at','1762945_s_at','1762983_s_at','1763132_s_at','1763138_s_at','1763146_s_at','1763198_s_at','1763383_at','1763410_s_at','1763426_s_at','1763490_s_at','1763491_s_at']; // change to gene name or probe id
    this.colLabel = ['con1027','con1028','con1029','con103','con1030','con1031','con1032','con1033','con1034','con1035','con1036','con1037','con1038','con1039','con1040','con1041','con108','con109','con110','con111','con112','con125','con126','con127','con128','con129','con130','con131','con132','con133','con134','con135','con136','con137','con138','con139','con14','con15','con150','con151','con152','con153','con16','con17','con174','con184','con185','con186','con187','con188','con189','con191','con192','con193','con194','con199','con2','con200','con201','con21']; // change to contrast name
    this.colorScale = d3.scale.quantile()
      .domain([ -10 , 0, 10])
      .range(this.colors);
    this.rowSortOrder=false;
    this.colSortOrder=false;
    this.svg = this.parentElement.append("svg")
      .attr("width", this.width + this.margin.left + this.margin.right)
      .attr("height", this.height + this.margin.top + this.margin.bottom)
      .append("g")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    // filter, aggregate, modify data
    this.wrangleData(null);

    // call the update method
    this.updateVis();
}

/* Wrassle the data.*/
HeatMap.prototype.wrangleData = function(filter){

    // displayData should hold the data which is visualized
    this.displayData = this.data.map(function(d) {
        return {
            row:   +d.row_idx,
            col:   +d.col_idx,
            value: +d.log2ratio
        };
    })

    console.log(this.displayData)

}

/** the drawing function - should use the D3 selection, enter, exit*/
HeatMap.prototype.updateVis = function(){

    var that = this;

    this.rowLabels = this.svg.append("g")
        .selectAll(".rowLabelg")
        .data(this.rowLabel)
        .enter()
        .append("text")
        .text(function (d) { return d; })
        .attr("x", 0)
        .attr("y", function (d, i) { return that.hcrow.indexOf(i+1) * that.cellSize; })
        .style("text-anchor", "end")
        .attr("transform", "translate(-6," + that.cellSize / 1.5 + ")")
        .attr("class", function (d,i) { return "rowLabel mono r"+i;} ) 
        .on("mouseover", function(d) {d3.select(this).classed("text-hover",true);})
        .on("mouseout" , function(d) {d3.select(this).classed("text-hover",false);})
        .on("click", function(d,i) {that.rowSortOrder=!that.rowSortOrder; that.sortbylabel("r",i,that.rowSortOrder);d3.select("#order").property("selectedIndex", 4).node().focus();;});

    var colLabels = this.svg.append("g")
        .selectAll(".colLabelg")
        .data(this.colLabel)
        .enter()
        .append("text")
        .text(function (d) { return d; })
        .attr("x", 0)
        .attr("y", function (d, i) { return that.hccol.indexOf(i+1) * that.cellSize; })
        .style("text-anchor", "left")
        .attr("transform", "translate("+ that.cellSize/2 + ",-6) rotate (-90)")
        .attr("class",  function (d,i) { return "colLabel mono c"+i;} )
        .on("mouseover", function(d) {d3.select(this).classed("text-hover",true);})
        .on("mouseout" , function(d) {d3.select(this).classed("text-hover",false);})
        .on("click", function(d,i) {that.colSortOrder=!that.colSortOrder;  sortbylabel("c",i,that.colSortOrder);d3.select("#order").property("selectedIndex", 4).node().focus();;});

    var heatMap = this.svg.append("g").attr("class","g3")
        .selectAll(".cellg")
        .data(this.displayData,function(d){return d.row+":"+d.col;})
        .enter()
        .append("rect")
        .attr("x", function(d) { return that.hccol.indexOf(d.col) * that.cellSize; })
        .attr("y", function(d) { return that.hcrow.indexOf(d.row) * that.cellSize; })
        .attr("class", function(d){return "cell cell-border cr"+(d.row-1)+" cc"+(d.col-1);})
        .attr("width", that.cellSize)
        .attr("height", that.cellSize)
        .style("fill", function(d) { return that.colorScale(d.value); })
        /* .on("click", function(d) {
            var rowtext=d3.select(".r"+(d.row-1));
            if(rowtext.classed("text-selected")==false){
               rowtext.classed("text-selected",true);
            }else{
               rowtext.classed("text-selected",false);
            }
        })*/
        .on("mouseover", function(d){
            //highlight text
            d3.select(this).classed("cell-hover",true);
            d3.selectAll(".rowLabel").classed("text-highlight",function(r,ri){ return ri==(d.row-1);});
            d3.selectAll(".colLabel").classed("text-highlight",function(c,ci){ return ci==(d.col-1);});

            //Update the tooltip position and value
            d3.select("#tooltip")
                .style("left", (d3.event.pageX+10) + "px")
                .style("top", (d3.event.pageY-10) + "px")
                .select("#value")
                .text("lables:"+that.rowLabel[d.row-1]+","+that.colLabel[d.col-1]+"\ndata:"+d.value+"\nrow-col-idx:"+d.col+","+d.row+"\ncell-xy "+this.x.baseVal.value+", "+this.y.baseVal.value);  
            //Show the tooltip
            d3.select("#tooltip").classed("hidden", false);
        })
        .on("mouseout", function(){
            d3.select(this).classed("cell-hover",false);
            d3.selectAll(".rowLabel").classed("text-highlight",false);
            d3.selectAll(".colLabel").classed("text-highlight",false);
            d3.select("#tooltip").classed("hidden", true);
        });

    var legend = this.svg.selectAll(".legend")
        .data([-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9,10])
        .enter().append("g")
        .attr("class", "legend");

    legend.append("rect")
        .attr("x", function(d, i) { return that.legendElementWidth * i; })
        .attr("y", that.height+(that.cellSize*2))
        .attr("width", that.legendElementWidth)
        .attr("height", that.cellSize)
        .style("fill", function(d, i) { return that.colors[i]; });

    legend.append("text")
        .attr("class", "mono")
        .text(function(d) { return d; })
        .attr("width", that.legendElementWidth)
        .attr("x", function(d, i) { return that.legendElementWidth * i; })
        .attr("y", that.height + (that.cellSize*4));

}

/**
 * Gets called by event handler and should create new aggregated data
 * aggregation is done by the function "aggregate(filter)". Filter has to
 * be defined here.*/
HeatMap.prototype.onSelectionChange= function(pass){

    // unpack passed object

    // make custom filter function to pass to wrangle
    var filter = function(d){
        return (d.time <= end && d.time >= start)
    }

    this.wrangleData(filter);

    this.updateVis();

}

HeatMap.prototype.order = function(value){
   
    var that = this;

    if(value=="hclust"){
        
        var t = this.svg.transition().duration(3000);
        
        t.selectAll(".cell")
            .attr("x", function(d) { return that.hccol.indexOf(d.col) * that.cellSize; })
            .attr("y", function(d) { return that.hcrow.indexOf(d.row) * that.cellSize; });

        t.selectAll(".rowLabel")
            .attr("y", function (d, i) { return that.hcrow.indexOf(i+1) * that.cellSize; });

        t.selectAll(".colLabel")
            .attr("y", function (d, i) { return that.hccol.indexOf(i+1) * that.cellSize; });
    }

    else if (value=="otherthing"){
        console.log("TODO")
    }
}



