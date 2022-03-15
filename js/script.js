/*
 */
/*
  PROTOTYPE COMMENTS:

  - currently built in d3 v5
  - build based on this example version code: https://d19jftygre6gh0.cloudfront.net/mapio/53fed7d84cd1812d6a6639ed7aa83868

  TO DOs:
  - reset view to full extent
  - add -/+ zoom buttons
  - fully comment code
  - inferred edge/link directionality?
*/
var width = 800;
var height = 600;
var margin = { top: 40, right: 10, bottom: 40, left: 35 };
var color = d3.scaleOrdinal(d3.schemeCategory10);

var legendColour = [
  "#01324b",
  "#be1818",
  "#0070a8",
  "#785ba7",
  "#007373",
  "#c75301",
];

var w = window.innerWidth;
var h = window.innerHeight;

/* var */ pearlData = {
  topicId: "",
  topicId: "",
  subTopicId: "",
  assetId: "",
  graph: {
    nodes: [],
    links: [],
  },
  label: {
    nodes: [],
    links: [],
  },
  affiliations: [],
  maxNumberArticles: -1,
  maxCircleRadius: 25,
  fieldOfStudy: [],
  Subtopic: [],
  selectedChartView: "Subtopic",
  selectedRankView: "rank",
  communityStartYear: Infinity,
  communityEndYear: -Infinity,
  topicsToDisable: ["Computational Social Science", "Scientific Reports"],
};

d3.selection.prototype.moveToFront = function () {
  return this.each(function () {
    this.parentNode.appendChild(this);
  });
};

d3.selection.prototype.moveToBack = function () {
  return this.each(function () {
    var firstChild = this.parentNode.firstChild;
    if (firstChild) {
      this.parentNode.insertBefore(this, firstChild);
    }
  });
};

// var files = ["data/nodes.json", "data/links.json"];
// var promises = [];

// files.forEach(function (url) {
//   promises.push(d3.json(url));
// }); // end forEach ...

// Promise.all(promises)
//   .then(function (data) {
//     drawChart(data);
//   })
//   .catch(function (error) {
//     // Do some error handling.
//     console.log("Promise error!:", error);
//   });

function drawChart(data) {
  console.log(data);
  pearlData.graph.nodes = data[0] /* [0].data */;
  pearlData.graph.links = data[1] /* [0].data */;

  var label = {
    nodes: [],
    links: [],
  };

  pearlData.graph.links.forEach(function (d, i) {
    d.source = d.researcher_id_1;
    d.target = d.researcher_id_2;
    d.value = d.weight;
  });

  pearlData.graph.nodes.forEach(function (d, i) {
    console.log(d);
    if (d.year < pearlData.communityStartYear) {
      pearlData.communityStartYear = d.year;
    }

    if (d.year > pearlData.communityEndYear) {
      pearlData.communityEndYear = d.year;
    }

    d.id = d.researcher_id;
    d["Subtopic"] = d.categories[0].segment;
    d["Field of Study"] = d.categories[1].segment;

    if (pearlData.fieldOfStudy.indexOf(d["Field of Study"]) == -1) {
      pearlData.fieldOfStudy.push(d["Field of Study"]);
    }

    if (pearlData.Subtopic.indexOf(d["Subtopic"]) == -1) {
      pearlData.Subtopic.push(d["Subtopic"]);
    }

    if (d.articles > pearlData.maxNumberArticles) {
      pearlData.maxNumberArticles = d.articles;
    }

    if (pearlData.affiliations.indexOf(d.affiliation) == -1) {
      pearlData.affiliations.push(d.affiliation);
    }

    label.nodes.push({ node: d });
    label.nodes.push({ node: d });
    label.links.push({
      source: i * 2,
      target: i * 2 + 1,
    });
  }); // end forEach

  console.log(pearlData.communityStartYear, pearlData.communityEndYear);

  // https://api.jqueryui.com/slider/#option-values
  // time slider https://jqueryui.com/slider/#steps
  // Setter
  // max: pearlData.communityEndYear,
  // values: [pearlData.communityStartYear, pearlData.communityEndYear],
  $(".slider-range")
    .slider("option", "min", pearlData.communityStartYear)
    .slider("option", "max", pearlData.communityEndYear)
    .slider("option", "values", [
      pearlData.communityStartYear,
      pearlData.communityEndYear,
    ]);

  setSliderTicks(".slider-range");

  $("#amount").val(
    $("#slider-range").slider("values", 0) +
      " to " +
      $("#slider-range").slider("values", 1)
  );

  if (pearlData.communityStartYear == pearlData.communityEndYear) {
    d3.selectAll(".slider-range").classed("hide", true);
    d3.selectAll(".timeRangeLabel").classed("hide", true);
  }

  pearlData.articleCircleRadiusScale = d3
    .scalePow()
    .exponent(0.5)
    .domain([0, pearlData.maxNumberArticles])
    .range([0, pearlData.maxCircleRadius]);

  pearlData.rankCircleRadiusScale = d3
    .scalePow()
    .exponent(0.5)
    .domain([0, 0.0005])
    .range([0, pearlData.maxCircleRadius]);

  console.log(pearlData);

  pearlData.labelLayout = d3
    .forceSimulation(label.nodes)
    .force("charge", d3.forceManyBody().strength(-50))
    .force("link", d3.forceLink(label.links).distance(0).strength(2))
    .stop();

  pearlData.graphLayout = d3
    .forceSimulation(pearlData.graph.nodes)
    .force("charge", d3.forceManyBody().strength(-3500))
    .force("center", d3.forceCenter(w / 2, h / 2))
    .force("x", d3.forceX(width / 2).strength(1))
    .force("y", d3.forceY(height / 2).strength(1))
    .force(
      "link",
      d3
        .forceLink(pearlData.graph.links)
        .id(function (d, i) {
          return d.id;
        })
        .distance(50)
        .strength(1)
    );

  // remove tick building https://bl.ocks.org/mbostock/1667139
  /*  .stop(); */
  // .on("tick", ticked);

  // remove tick building https://bl.ocks.org/mbostock/1667139
  d3.timeout(function () {
    for (
      var i = 0,
        n = Math.ceil(
          Math.log(pearlData.graphLayout.alphaMin()) /
            Math.log(1 - pearlData.graphLayout.alphaDecay())
        );
      i < n;
      ++i
    ) {
      pearlData.graphLayout.on("tick", ticked).tick();
    }

    var adjlist = [];

    pearlData.graph.links.forEach(function (d) {
      adjlist[d.source.index + "-" + d.target.index] = true;
      adjlist[d.target.index + "-" + d.source.index] = true;
    });

    function neigh(a, b) {
      return a == b || adjlist[a + "-" + b];
    }

    pearlData.svg = d3
      .select("#container")
      .append("svg")
      .attr("class", "vis")
      .attr("width", width - margin.left - margin.right)
      .attr("height", height - margin.top - margin.bottom);

    // pearlData.svg
    //   .append("g")
    //   .attr("class", "legend-group")
    //   .attr("transform", "translate(" + w / 2 + "," + 0 + ")")
    //   .append("rect")
    //   .attr("x", 0)
    //   .attr("y", 0)
    //   .attr("width", 50)
    //   .attr("height", 50)
    //   .style("fill", "red");

    var container = pearlData.svg
      .append("g")
      .attr("class", "pearlData-knowledgeGraph-group")
      .attr("transform", "translate(" + 0 + "," + 0 + ")");

    pearlData.svg.call(
      d3
        .zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", function () {
          // console.log(d3.event.transform);
          container.attr("transform", d3.event.transform);
        })
    );

    // https://stackoverflow.com/questions/36579339/how-to-draw-line-with-arrow-using-d3-js
    pearlData.svg
      .append("svg:defs")
      .append("svg:marker")
      .attr("id", "triangle")
      .attr("refX", 6)
      .attr("refY", 6)
      .attr("markerWidth", 30)
      .attr("markerHeight", 30)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M 0 0 12 6 0 12 3 6")
      .style("fill", "black");

    var link = container
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(pearlData.graph.links)
      .enter()
      .append("line")
      /* .attr("marker-end", "url(#triangle)") */
      .attr("class", function (d, i) {
        return "link";
      })
      .style("stroke", "#aaa")
      .style("stroke-width", "1.5px")
      .style("opacity", 0.33)
      .on("mouseout", function (d, i) {
        d3.selectAll(".link").style("opacity", 0.33);
        d3.selectAll(".circles").style("opacity", 1.0);
        d3.selectAll(".nodeLabel").style("opacity", 1.0);
        return;
      })
      .on("mouseover", function (d, i) {
        var researcher1 = d.researcher_id_1;
        var researcher2 = d.researcher_id_2;

        d3.selectAll(".link").style("opacity", 0.1);
        d3.selectAll(".circles").style("opacity", 0.1);
        d3.selectAll(".nodeLabel").style("opacity", 0.1);

        d3.select(this).style("opacity", 1);
        d3.selectAll(
          ".circles.researchers.researcher-" + researcher1.replaceAll(".", "-")
        ).style("opacity", 1);

        d3.selectAll(
          ".circles.researchers.researcher-" + researcher2.replaceAll(".", "-")
        ).style("opacity", 1);

        d3.selectAll(
          ".nodeLabel.researcher-" + researcher1.replaceAll(".", "-")
        ).style("opacity", 1);

        d3.selectAll(
          ".nodeLabel.researcher-" + researcher2.replaceAll(".", "-")
        ).style("opacity", 1);

        return;
      });

    var node = container
      .append("g")
      .attr("class", function (d, i) {
        return "nodes";
      })
      .selectAll("g")
      .data(pearlData.graph.nodes)
      .enter()
      .append("g")
      .attr("transform", function (d, i) {
        return "translate(" + d.x + "," + d.y + ")";
      })
      .attr("class", function (d, i) {
        return (
          "node researchers researcher-" +
          d.researcher_id.replaceAll(".", "-") +
          " community-" +
          d.community
        );
      });

    node
      .append("circle")
      .attr("class", function (d, i) {
        return (
          "circles researchers researcher-" +
          d.researcher_id.replaceAll(".", "-") +
          " community-" +
          d.community
        );
      })
      .attr("r", function (d, i) {
        if (pearlData.selectedRankView == "articles") {
          return pearlData.articleCircleRadiusScale(d.articles);
        } else {
          return pearlData.rankCircleRadiusScale(d.pagerank);
        }
        // return pearlData.articleCircleRadiusScale(d.articles);
        // return pearlData.rankCircleRadiusScale(d.pagerank);
      })
      .style("fill", function (d) {
        return legendColour[
          pearlData[pearlData.selectedChartView].indexOf(
            d[pearlData.selectedChartView]
          )
        ];
      })
      .style("stroke", function (d) {
        return legendColour[
          pearlData[pearlData.selectedChartView].indexOf(
            d[pearlData.selectedChartView]
          )
        ];
      })
      .style("stroke-width", function (d) {
        return 2.0;
      })
      .style("fill-opacity", function (d) {
        return 0.5;
      });

    node
      .on("mouseover", focus)
      .on("mousemove", maintainFocus)
      .on("mouseout", unfocus);

    // node.call(
    //   d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended)
    // );
    // pearlData.svg.on("mousedown", mousedown).on("mouseup", mouseup);

    node
      .append("text")
      .attr("class", function (d, i) {
        return "nodeLabel researcher-" + d.researcher_id.replaceAll(".", "-");
      })
      .text(function (d, i) {
        return d.first_name + " " + d.last_name;
      })
      .attr("x", function (d, i) {
        // return pearlData.articleCircleRadiusScale(d.articles) + 2.5;
        return pearlData.rankCircleRadiusScale(d.pagerank) + 2.5;
      })
      .attr("y", function (d, i) {
        // return pearlData.articleCircleRadiusScale(d.articles) + 2.5;
        return pearlData.rankCircleRadiusScale(d.pagerank) + 2.5;
      })
      .style("fill", "#555")
      .style("font-family", "Arial")
      .style("font-weight", "bold")
      .style("font-size", 8)
      .style("pointer-events", "none") // to prevent mouseover/drag capture
      .style("dislay", "none");

    node.on("mouseover", focus).on("mouseout", unfocus);

    function ticked() {
      node.call(updateNode);
      link.call(updateLink);

      return;
    } // end function ticked

    function fixna(x) {
      if (isFinite(x)) return x;
      return 0;
    }

    function mousedown(d, i) {
      console.log("mousedown");

      return;
    } // end function mousedown

    function mouseup(d, i) {
      console.log("mouseup");

      return;
    } // end function mouseup

    function focus(d) {
      var coords = d3.mouse(this);
      d3.select(this).moveToFront();

      // https://stackoverflow.com/questions/29422792/how-to-get-the-total-number-of-rows-with-particular-value-in-json-file-in-d3-js
      var numberOfRelationships = pearlData.graph.links.reduce(function (
        count,
        entry
      ) {
        return count + (entry.researcher_id_1 === d.id ? 1 : 0);
      },
      0);

      numberOfRelationships =
        numberOfRelationships +
        pearlData.graph.links.reduce(function (count, entry) {
          return count + (entry.researcher_id_2 === d.id ? 1 : 0);
        }, 0);

      // create a new tooltiptooltip
      d3.select(this)
        .append("g")
        .attr("class", "tooltip")
        .attr(
          "transform",
          "translate(" + coords[0] + 10 + "," + coords[1] + 10 + ")"
        )
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 250)
        .attr("height", 100)
        .style("fill", "#FFF")
        .style("stroke", "#000")
        .style("stroke-width", 1)
        .style("display", "inline")
        .style("pointer-events", "none")
        .style("z-index", 200);

      d3.selectAll(".tooltip")
        .append("text")
        .attr("class", "selectedResearcher")
        .attr("x", 5)
        .attr("y", 15)
        .style("font-size", "0.85rem")
        .style("fill", "#000")
        .style("font-weight", "bold")
        .style("stroke", "none")
        .style("stroke-width", 0)
        .style("pointer-events", "none")
        .text(d.first_name + " " + d.last_name);

      d3.selectAll(".tooltip")
        .append("text")
        .attr("class", "numberOfArticlesPublished")
        .attr("x", 5)
        .attr("y", 35)
        .style("font-size", "0.75rem")
        .style("fill", "#000")
        .style("stroke", "none")
        .style("stroke-width", 0)
        .style("pointer-events", "none")
        .text("No. Published Articles: " + d.articles);

      d3.selectAll(".tooltip")
        .append("text")
        .attr("class", "lastPublished")
        .attr("x", 5)
        .attr("y", 55)
        .style("font-size", "0.75rem")
        .style("fill", "#000")
        .style("stroke", "none")
        .style("stroke-width", 0)
        .style("pointer-events", "none")
        .text("Last Year of Publication : " + d.year);

      d3.selectAll(".tooltip")
        .append("text")
        .attr("class", "relationships")
        .attr("x", 5)
        .attr("y", 75)
        .style("font-size", "0.75rem")
        .style("fill", "#000")
        .style("stroke", "none")
        .style("stroke-width", 0)
        .style("pointer-events", "none")
        .text("Number Of Relationships: " + numberOfRelationships);

      // d3.selectAll(".tooltip")
      //   .append("text")
      //   .attr("class", "affiliation")
      //   .attr("x", 5)
      //   .attr("y", 95)
      //   .style("font-size", "0.75rem")
      //   .style("fill", "#000")
      //   .style("stroke", "none")
      //   .style("stroke-width", 0)
      //   .style("pointer-events", "none")
      //   .text("Affiliation: " + d.affiliation)
      //   .call(wrap, 230); // wrap the text in <= 30 pixels;

      d3.select(this).moveToFront();

      var index = d3.select(d3.event.target).datum().index;

      node.style("opacity", function (o) {
        return neigh(index, o.index) ? 1 : 0.1;
      });

      link.style("opacity", function (o) {
        return o.source.index == index || o.target.index == index ? 1 : 0.1;
      });

      return;
    } // end function focus

    function maintainFocus(d) {
      var coords = d3.mouse(this);

      d3.selectAll(".tooltip").attr(
        "transform",
        "translate(" + (coords[0] + 10) + "," + (coords[1] + 10) + ")"
      );

      return;
    } // function maintainFocus

    function unfocus(d) {
      node.style("opacity", 1);
      // d3.selectAll(".node.outsideRange").style("opacity", 0.33);
      link.style("opacity", 0.33);
      d3.selectAll(".tooltip").remove();

      return;
    } // end function unfocus

    function updateLink(link) {
      // console.log(link);
      link
        .attr("x1", function (d) {
          // console.log(d);
          return fixna(d.source.x);
        })
        .attr("y1", function (d) {
          return fixna(d.source.y);
        })
        .attr("x2", function (d) {
          return fixna(d.target.x);
        })
        .attr("y2", function (d) {
          return fixna(d.target.y);
        });
    }

    function updateNode(node) {
      node.attr("transform", function (d) {
        return "translate(" + fixna(d.x) + "," + fixna(d.y) + ")";
      });
    }

    function dragstarted(d) {
      d3.event.sourceEvent.stopPropagation();
      if (!d3.event.active) pearlData.graphLayout.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }

    function dragended(d) {
      if (!d3.event.active) pearlData.graphLayout.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    d3.select(".tooltip").moveToFront();

    function wrap(text, width) {
      text.each(function () {
        var text = d3.select(this),
          words = text.text().split(/\s+/).reverse(),
          word,
          line = [],
          lineNumber = 0,
          lineHeight = 1.1, // ems
          x = text.attr("x"),
          y = text.attr("y"),
          dy = 0, //parseFloat(text.attr("dy")),
          tspan = text
            .text(null)
            .append("tspan")
            .attr("x", x)
            .attr("y", y)
            .attr("dy", dy + "em");
        while ((word = words.pop())) {
          line.push(word);
          tspan.text(line.join(" "));
          if (tspan.node().getComputedTextLength() > width) {
            line.pop();
            tspan.text(line.join(" "));
            line = [word];
            tspan = text
              .append("tspan")
              .attr("x", x)
              .attr("y", y)
              .attr("dy", ++lineNumber * lineHeight + dy + "em")
              .text(word);
          }
        }
      });
    }
  });

  return;
} // end function drawChart

function getViewType(fid) {
  pearlData.selectedChartView = fid.id;

  d3.selectAll(".circles.researchers")
    .transition()
    .duration(750)
    .ease(d3.easeLinear)
    .style("fill", function (d, i) {
      return legendColour[
        pearlData[pearlData.selectedChartView].indexOf(
          d[pearlData.selectedChartView]
        )
      ];
    });

  return;
} // end function getViewType

function getScaleType(fid) {
  pearlData.selectedRankView = fid.id;

  d3.selectAll(".circles.researchers")
    .transition()
    .duration(750)
    .ease(d3.easeLinear)
    .attr("r", function (d, i) {
      if (pearlData.selectedRankView == "articles") {
        return pearlData.articleCircleRadiusScale(d.articles);
      } else {
        return pearlData.rankCircleRadiusScale(d.pagerank);
      }
    });

  return;
} // end function getScaleType

// https://jqueryui.com/slider/#steps
$(function () {
  $("#slider-range").slider({
    range: true,
    step: 1,
    min: 2000,
    max: 2020,
    value: [2000, 2020],
    slide: function (event, ui) {
      $("#amount").val(ui.values[0] + " to " + ui.values[1]);

      d3.select(".node.researchers").classed("outsideRange", false);

      d3.selectAll(".node.researchers")
        .transition()
        .duration(250)
        .ease(d3.easeLinear)

        .style("opacity", function (d, i) {
          if (d.year < ui.values[0] || d.year > ui.values[1]) {
            d3.select(this).classed("outsideRange", true);
            return 0.05;
          } else {
            d3.select(this).classed("outsideRange", false);
            return 1.0;
          }
        });
    },
  });
});

// https://stackoverflow.com/questions/8648963/add-tick-marks-to-jquery-slider
function setSliderTicks(el) {
  var $slider = $(el);
  var min = $slider.slider("option", "min");
  var max = $slider.slider("option", "max");
  var spacing = 100 / (max - min);

  $slider.find(".ui-slider-tick-mark").remove();
  for (var i = 0; i < max - min; i++) {
    $('<span class="ui-slider-tick-mark"></span>')
      .css("left", spacing * i + "%")
      .appendTo($slider);
  }
}

// const btn = document.querySelector("#submitTopic");
// const radioButtons = document.querySelectorAll('input[name="topic"]');
// btn.addEventListener("click", () => {
//   for (const radioButton of radioButtons) {
//     if (radioButton.checked) {
//       selected = radioButton.value;
//       console.log(selected);
//       break;
//     }
//   }
//   console.log("selected:", selected);

//   d3.selectAll(".mask").classed("hide", true);
//   d3.selectAll(".container").classed("hide", false);

//   var files = [
//     "data/" + selected + "/nodes.json",
//     "data/" + selected + "/links.json",
//   ];
//   var promises = [];

//   console.log(files);

//   files.forEach(function (url) {
//     console.log(url);
//     promises.push(d3.json(url));
//   }); // end forEach ...

//   Promise.all(promises)
//     .then(function (data) {
//       console.log(data);
//       drawChart(data);
//     })
//     .catch(function (error) {
//       // Do some error handling.
//       console.log("Promise error!:", error);
//     });
// });

// https://codepen.io/jorgemaiden/pen/YgGZMg
var linkToggle = document.querySelectorAll(".js-toggle");

for (i = 0; i < linkToggle.length; i++) {
  linkToggle[i].addEventListener("click", function (event) {
    event.preventDefault();

    var container = document.getElementById(this.dataset.container);

    if (!container.classList.contains("active")) {
      container.classList.add("active");

      container.style.height = "auto";

      var height = container.clientHeight + "px";

      container.style.height = "0px";

      setTimeout(function () {
        container.style.height = height;
      }, 0);
    } else {
      container.style.height = "0px";

      container.addEventListener(
        "transitionend",
        function () {
          container.classList.remove("active");
        },
        {
          once: true,
        }
      );
    }
  });
}
