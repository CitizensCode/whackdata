(function(bracketCreep, undefined){

/* To get jshint off my case */
/* globals d3help: true */

bracketCreep.visualize = function(sheet) {

  // Get the data from the Google sheet
  var rawData = sheet.elements;

  var maxX = 300000;

  var processedData = d3help.sheetToObj(rawData, "province", {key: "incomeadjusted", value: maxX});

  // A very specific sorting of the lines so that PEI is drawn last
  var sortArr = [];
  sortArr[0] = _.where(processedData, {province: "New Brunswick 2005"})[0];
  sortArr[1] = _.where(processedData, {province: "New Brunswick 2014"})[0];
  sortArr[2] = _.where(processedData, {province: "Prince Edward Island 2005"})[0];
  sortArr[3] = _.where(processedData, {province: "Prince Edward Island 2014"})[0];
  processedData = sortArr;

  // Chart options
  var DEFAULT_OPTIONS = {
    margin: {top: 60, right: 60, bottom: 90, left: 60},
    initialWidth: 'auto'
  };
  // Set up the d3Kit chart skeleton. We add more properties to it later once we've defined some other functions.
  var chart = new d3Kit.Skeleton('#bracketCreep', DEFAULT_OPTIONS);

  // Create some layers to organize the visualization
  var layers = chart.getLayerOrganizer();
  layers.create(
    ['content',
     'x-axis',
     'y-axis',
     'voronoi']
   );

  var width = chart.getInnerWidth();
  var height = chart.getInnerHeight();

  // Scales for the margin sizes and axis-label placement
  var maxWidthApprox = 750;
  var minWidthApprox = 320;
  var xAxisScale = d3.scale.pow()
    .exponent(0.5)
    .domain([minWidthApprox, maxWidthApprox])
    .range([0,15]);
  var yAxisScale = d3.scale.pow()
    .exponent(0.5)
    .domain([minWidthApprox, maxWidthApprox])
    .range([0,10]);

  chart.margin({
    top: 10, // Selected by trial and error
    right: 20, // Same
    bottom: 60 + yAxisScale(width),
    left: 40 + xAxisScale(width)
  }, true); // Do not dispatch the resize event

  // The above impacted the width and height, so we grab the new values here
  width = chart.getInnerWidth();
  height = chart.getInnerHeight();

  // Scales for the data
  var margins = chart.margin();
  var x = d3.scale.linear()
    .range([0, width]);
  var y = d3.scale.linear()
    .range([height, 0]);

  var xAxis = d3.svg.axis()
    .scale(x)
    .orient('bottom')
    .tickFormat(d3.format("$s"));
  var yAxis = d3.svg.axis()
    .scale(y)
    .orient('left')
    .tickFormat(function(d) {
      return parseInt(d, 10) + "%";
    });

  // X-Axis Label
  layers.get('x-axis')
    .append("text")
    .attr("class", "x label")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", 40 + yAxisScale(width))
    .text("Income (2016 Dollars)");

  // Y-Axis Label
  layers.get('y-axis')
    .append("text")
    .attr("class", "y label")
    .attr("text-anchor", "middle")
    .attr("y", -40 - xAxisScale(width))
    .attr("x", height / -2 )
    .attr("dy", ".75em")
    .attr("transform", "rotate(-90)")
    .text("Effective Income Tax");

  var lineGen = d3.svg.line()
    .x(function(d) { return x(d.incomeadjusted); })
    .y(function(d) { return y(d.effectiveincometax); });

  // The main visualization function. Debounce keeps it from rendering too many times per second during updates.
  var visualize = d3Kit.helper.debounce(function(){
    if(!chart.hasData()) {
      // If for some reason the chart doesn't have data, remove all the visual elements
      d3Kit.helper.removeAllChildren(layers.get('content'));
    }

    // Grab them in case they've changed
    width = chart.getInnerWidth();
    height = chart.getInnerHeight();
    chart.margin({
      top: 10,
      right: 20,
      bottom: 60 + yAxisScale(width),
      left: 40 + xAxisScale(width)
    }, true);
    // Get the new values
    width = chart.getInnerWidth();
    height = chart.getInnerHeight();

    var data = chart.data();
    x.domain([0, maxX]) // $500k
      .range([0, width]);
    y.domain([0, 17]) // 17% tax
      .range([height, 0]);

    layers.get('x-axis')
      .attr('transform', 'translate(0,' + height + ')')
      .call(xAxis)
    .selectAll(".tick text")
      .attr("y", 0)
      .attr("x", -4)
      .style("transform", "rotate(-45deg)")
      .style("text-anchor", "end");
    layers.get('y-axis')
      .call(yAxis);

    // Draw the lines
    var selection = layers.get('content')
      .selectAll('.line')
      .data(data, function(d) {
        return d.province;
      });

    selection.transition()
      .attr("d", function(d) {
        return lineGen(d.values);
      });

    selection.enter()
      .append('path')
      .attr('class', 'line')
      .attr('id', function(d) {
        // Add a class for formatting each
        return "creep-" + d3help.cleanString(d.province);
      })
      .attr("d", function(d) {
        // Include itself in its data. Used for voronoi hover.
        d.line = this;
        return lineGen(d.values);
      });

    var vertLineObj = [
      {"incomeadjusted": 37602,
       "effectiveincometax": 7.5},
      {"incomeadjusted": 37602,
       "effectiveincometax": 8.2}
     ];
    var horLineObjA = [
      {"incomeadjusted": 0,
       "effectiveincometax": 7.5},
      {"incomeadjusted": 37602,
       "effectiveincometax": 7.5}
     ];
    var horLineObjB = [
      {"incomeadjusted": 0,
       "effectiveincometax": 8.2},
      {"incomeadjusted": 37602,
       "effectiveincometax": 8.2}
     ];

    var lineDrawn = d3.select(".vert-line")[0][0];
    // This draws the lines showing the bracket creep.
    if (_.isNull(lineDrawn)) {
      layers.get('content')
        .append("path")
        .attr("class", "vert-line")
        .attr("d", function() {
          return lineGen(vertLineObj);
        });
      layers.get('content')
        .append("path")
        .attr("class", "hor-line-a")
        .attr("stroke-dasharray", "5,5")
        .attr("d", function() {
          return lineGen(horLineObjA);
        });
      layers.get('content')
        .append("path")
        .attr("class", "hor-line-b")
        .attr("stroke-dasharray", "5,5")
        .attr("d", function() {
          return lineGen(horLineObjB);
        });
      layers.get('content')
        .append("text")
        .attr("class", "creep-label")
        .attr("x", x(10000))
        .attr("y", y(7.65))
        .text("0.8%");
    } else {
      d3.select(".vert-line")
        .transition()
        .attr("d", function() {
          return lineGen(vertLineObj);
        });
      d3.select(".hor-line-a")
        .transition()
        .attr("d", function() {
          return lineGen(horLineObjA);
        });
      d3.select(".hor-line-b")
        .transition()
        .attr("d", function() {
          return lineGen(horLineObjB);
        });
      d3.select(".creep-label")
        .transition()
        .attr("x", x(10000))
        .attr("y", y(7.65));
    }

    // X-Axis Label
    layers.get('x-axis')
      .select('.x')
      .attr("x", width / 2)
      .attr("y", 50 + yAxisScale(width));

    // Y-Axis Label
    layers.get('y-axis')
      .select('.y')
      .attr("y", -40 - xAxisScale(width))
      .attr("x", height / -2 );

    ///// Add the voronoi layer

    // Set up the voronoi generator
    var voronoi = d3.geom.voronoi()
      .x(function(d) {
        return x(d.incomeadjusted);
      })
      .y(function(d) {
        return y(d.effectiveincometax);
      })
      .clipExtent([
        [-margins.left, -margins.top],
        [width + margins.right, height + margins.bottom]
      ]);

    // This configures the hover tip
    var focus = layers.get('voronoi')
      .append("g")
      .attr("transform", "translate(-9000,-9000)")
      .attr("class", "tooltip tt-box");

    focus.append("circle")
      .attr('class', 'tooltip tt-circle')
      .attr("stroke", "black")
      .attr("stroke-width", "1")
      .attr("fill", "white")
      .attr("r", 6);

    focus.append("text")
      .attr('class', 'tooltip tt-title')
      .attr("y", -40);

    focus.append("text")
      .attr('class', 'tooltip tt-valueA')
      .attr("y", -25);

    focus.append("text")
      .attr('class', 'tooltip tt-valueB')
      .attr("y", -10);

    // First set up some mouse functions
    var mouseover = function(d) {
      // Make the line turn black
      d3.select(d.parentObj.line)
        .classed("line-hover", true);
      d.parentObj.line.parentNode.appendChild(d.parentObj.line);
      // Move the label and text into view and change the label
      focus.attr("transform", "translate(" + x(d.incomeadjusted) + "," + y(d.effectiveincometax) + ")");

      // Update the tooltip
      focus.select(".tt-title")
        .text(d.parentObj.province);
      focus.select(".tt-valueA")
        .text("Income Tax: " + d.effectiveincometax + "%");
      focus.select(".tt-valueB")
      .text("Income: $" + d.incomeadjusted);
    };

    var mouseout = function(d) {
      d3.select(d.parentObj.line).classed("line-hover", false);
      focus.attr("transform", "translate(-9000, -9000)");
    };

    var voronoiGroup = layers.get('voronoi')
      .selectAll("path")
      .data(voronoi(
        d3.nest()
        // Group the data by its x/y coords
        .key(function(d) {
          return x(d.incomeadjusted) + "," + y(d.effectiveincometax);
        })
        // Return the first value if there's multiple. This is necessary for the voronoi function to work properly
        .rollup(function(v) {
          return v[0];
        })
        // Flatten the data out so you can feed it into the nest function. This grabs all the xy values from each separate line's array of objects, and merges them into one giant array of objects.
        .entries(
          d3.merge(data.map(
            function(d) {
              return d.values;
            }
          ))
        )
        // Turn the result of the above into an array of objects that can be fed to the voronoi generator
        .map(function(d) {
          return d.values;
        })
      ));

    voronoiGroup.attr("d", function(d) {
        return "M" + d.join("L") + "Z";
      })
      .datum(function(d) {
        return d.point;
      });

    voronoiGroup.enter().append("path")
      // Draw the polygon (invisibly) by joining the points together with a path
      .attr("d", function(d) {
        return "M" + d.join("L") + "Z";
      })
      // Assign the polygon the data from the point it surrounds
      .datum(function(d) {
        return d.point;
      })
      .on("mouseover", mouseover)
      .on("mouseout", mouseout);

  }, 10); // Debounce at 10 milliseconds

  // Line labels
  layers.get('content')
   .append("text")
    .attr("dy", "-3")
    .attr("class", "curve-text")
   .append("textPath")
    .attr("class", "creep-newbrunswick2014-label")
    .attr("xlink:href", "#creep-newbrunswick2014")
    .attr("startOffset", "85%")
    .text("NB 2005/2014");

  layers.get('content')
   .append("text")
    .attr("dy", "-3")
    .attr("class", "curve-text")
   .append("textPath")
    .attr("class", "creep-princeedwardisland2014-label")
    .attr("xlink:href", "#creep-princeedwardisland2014")
    .attr("startOffset", "50%")
    .text("PEI 2014");

  layers.get('content')
   .append("text")
    .attr("dy", "14")
    .attr("class", "curve-text")
   .append("textPath")
    .attr("class", "creep-princeedwardisland2005-label")
    .attr("xlink:href", "#creep-princeedwardisland2005")
    .attr("startOffset", "89%")
    .text("PEI 2005");

  chart
    .autoResize(true)
    .autoResizeToAspectRatio(1.5)
    .on('resize', visualize)
    .on('data', visualize)
    .data(processedData);

};

}(window.bracketCreep = window.bracketCreep || {}));
