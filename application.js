var calculator = angular.module('calculator', ['fcsa-number']);

calculator.controller('CalculatorController', function ($scope) {
  $scope.data = data;

  $scope.applyDefault = function(field, _default) {
    field.value = Math.round(_default.value * 100) / 100;
  };

  $scope.applyPreset = function(term, preset) {
    _.forEach(preset.values, function(value, attr) {
      var field = _.find(term.fields, {id: attr});
      field.value = Math.round(value * 100) / 100;
    });
  };

  $scope.save = function() {
    var values = _.map($scope.data.years, function(terms) {
      return _.map(terms, function(term) {
        return _.map(term.fields, function(field) {
          return parseFloat(field.value);
        });
      });
    });
    return JSON.stringify(values);
  };

  $scope.load = function(json) {
    var local = _.clone($scope.data);
    try {
      var values = JSON.parse(json);

      _.forEach(local.years, function(terms, i) {
        _.forEach(terms, function(term, j) {
          _.forEach(term.fields, function(field, k) {
            field.value = parseFloat(values[i][j][k]);
          });
        });
      });

      $scope.data = local;
    } catch (e) {
      console.log("Could not load data: ", e);
    }
  };

  if (window.location.hash) {
    $scope.load(window.location.hash.slice(1));
  }

  $scope.$watch('data', function(newValue) {
    window.location.hash = $scope.save();
  }, true);
});
calculator.directive('graph', function () {
  var margin = {top: 20, right: 20, bottom: 30, left: 60},
      width = 750 - margin.left - margin.right,
      height = 300 - margin.top - margin.bottom;

  return {
    link: function (scope, element, attrs) {
      var x = d3.scale.ordinal()
          .rangeRoundBands([0, width], 0.1);

      var y = d3.scale.linear()
          .range([height, 0]);

      var xAxis = d3.svg.axis()
          .scale(x)
          .orient("bottom");

      var yAxis = d3.svg.axis()
          .scale(y)
          .orient("left")
          .ticks(10, "$");

      var path, xAxisElement, yAxisElement, bars;

      var line = d3.svg.line()
          .x(function(d) { return x(d.term); })
          .y(function(d) { return y(d.total); })
          .interpolate('monotone');

      var svg = d3.select(element[0]).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      scope.$watch('data', function (newVal, oldVal) {
        var total = 0;

        var points = _.flatten(_.map(data.years, function(year) {
          return _.map(year, function(term) {
            var gross = _.reduce(term.fields, function(acc, field) {
              return acc + ((field.multiplier || 1) * (field.value || 0));
            }, 0);

            var classes = [];
            if (gross < 0) {
              classes.push('unprofitable');
            } else if (gross > 0) {
              classes.push('profitable');
            }

            return {
              term: _.last(term.id.split("_")),
              gross: gross,
              total: (total = total + gross),
              classes: classes
            };
          });
        }));

        x.domain(points.map(function(d) { return d.term; }));
        y.domain(d3.extent(points, function(d) { return d.total; })).range([height, 0]).nice();

        var grandTotal = points[points.length - 1].total;

        //  TODO: For code cleanliness, this shouldn't be in here.
        document.getElementById('total').innerHTML =
          Math.abs(grandTotal).toLocaleString(
            undefined,
            {
              style: 'currency',
              currency: "CAD",
              minimumFractionDigits: 2,
            }
          ).replace("CA", "");

        if (grandTotal >= 0) {
          document.getElementById('earnings').classList.add('positive');
          document.getElementById('earnings').classList.remove('negative');
        } else {
          document.getElementById('earnings').classList.remove('positive');
          document.getElementById('earnings').classList.add('negative');
        }

        if (!xAxisElement) {
          xAxisElement = svg.append("g");
        }

        xAxisElement
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")")
          .text("Term")
          .call(xAxis);

        if (!yAxisElement) {
          yAxisElement = svg.append("g");
        }

        yAxisElement
            .attr("class", "y axis")
            .call(yAxis)
          .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", "1em")
            .style("text-anchor", "end")
            .text("Debt or Profit");

        if (!bars) {
          bars = svg
            .selectAll(".bar")
            .data(points)
            .enter().append("rect");
        }

        bars
          .data(points)
          .transition()
          .attr("class", function(d) { return 'bar ' + (d.classes || ''); })
          .attr("x", function(d) { return x(d.term); })
          .attr("width", x.rangeBand())
          .attr("y", function(d) { return y(Math.max(0, d.gross)); })
          .attr("height", function(d) { return Math.abs(y(d.gross) - y(0)); });

        if (!path) {
          path = svg.append("path");
        }

        path
          .datum(points)
          .transition()
          .attr("class", "line")
          .attr("transform", "translate(" + (x.rangeBand() / 2) + ", 0)")
          .attr("d", line);
      }, true);
    },
  };
});
  

terms = ["1A", "1B",  "WT1", "2A",  "WT2", "2B",  "WT3",
         "3A", "WT4", "3B",  "WT5", "4A",  "WT6", "4B"];

var workPresets = function(workTermIndex) {
  var presets = [];
  var totalTerms = 6;

  var waterlooEarningsLow = 3520;
  var waterlooEarningsHigh = 5600;
  presets.push({
    name: "Waterloo",
    values: {
      earnings: waterlooEarningsLow + ((waterlooEarningsHigh - waterlooEarningsLow) / totalTerms) * workTermIndex,
      housing: 500,
    }
  });

  var torontoEarningsLow = 3520;
  var torontoEarningsHigh = 5960;
  presets.push({
    name: "Toronto",
    values: {
      earnings: torontoEarningsLow + ((torontoEarningsHigh - torontoEarningsLow) / totalTerms) * workTermIndex,
      housing: 800,
    }
  });

  var sfEarningsLow = 7260; //  $36/h + housing
  var sfEarningsHigh = 8700; // $45/h + housing
  presets.push({
    name: "San Francisco Bay Area",
    values: {
      earnings: sfEarningsLow + ((sfEarningsHigh - sfEarningsLow) / totalTerms) * workTermIndex,
      housing: 2500,
    }
  });

  var eCoopEarningsLow = 0;
  var eCoopEarningsHigh = 2000;
  presets.push({
    name: "ECoop (in Waterloo)",
    values: {
      earnings: eCoopEarningsLow + ((eCoopEarningsHigh - eCoopEarningsLow) / totalTerms) * workTermIndex,
      housing: 500,
    }
  });

  return presets;
};

var schoolTerm = function(name) {
  return {
    id: name,
    name: "Term " + name,
    fields: [
      {
        id: "tuition",
        name: "Tuition",
        multiplier: -1,
        value: {
          "1A":  5883.00,
          "1B":  5883.00,
          "2A":  5883.00,
          "2B":  5771.00,
          "3A":  5771.00,
          "3B":  5634.00,
          "4A":  5501.00,
          "4B":  5299.00,
        }[name],
      },
      {
        id: "fees",
        name: "School Fees",
        multiplier: -1,
        value: {
          "1A": 1133.15,
          "1B": 1133.15,
          "2A": 1133.15,
          "2B": 1133.15,
          "3A": 1133.15,
          "3B": 1133.15,
          "4A": 1133.15,
          "4B": 1133.15,
        }[name],
      },
      {
        id: "scholarships",
        name: "Scholarships",
        multiplier: 1,
        value: {
          "1A": 2000.00,
        }[name],
        defaults: [
          {
            name: "None",
            value: "0",
          },
          {
            name: "President's Scholarship",
            value: "2000",
          },
        ],
      },
      {
        id: "housing",
        name: "Housing",
        unit: "month",
        multiplier: -4,
        value: {
          "1A": 671.75,
          "1B": 671.75,
        }[name],
        defaults: [
          {
            name: "Off-Campus",
            value: "500.00"
          },
          {
            name: "With Parents",
            value: "0.00",
          },
          {
            name: "Off-Campus (Cheap)",
            value: "350.00",
          },
          {
            name: "V1, REV, MKV",
            value: "671.75",
          },
          {
            name: "VeloCity",
            value: "775.75",
          },
        ],
      },
      {
        id: "living",
        name: "Living Costs",
        detail: "Food, Coffee, etc.",
        multiplier: -4,
        value: 400.00,
        unit: "month",
      },
      {
        id: "earnings",
        name: "Income",
        detail: "Part-Time, Freelance, etc.",
        multiplier: -4,
        unit: "month",
      },
    ],
  };
};

var workTerm = function(name) {
  var index = parseInt(name.replace("WT", ""), 10);
  return {
    id: name,
    name: "Work Term " + index,
    presets: workPresets(index),
    fields: [
      {
        id: "earnings",
        name: "Income",
        multiplier: 4,
        unit: "month",
      },
      {
        id: "housing",
        name: "Housing",
        multiplier: -4,
        unit: "month",
      },
      {
        id: "living",
        name: "Living Costs",
        detail: "Food, Coffee, etc.",
        multiplier: -4,
        value: 400.00,
        unit: "month",
      },
      {
        id: "tuition",
        name: "Tuition",
        detail: "Online Courses",
        multiplier: -1,
        defaults: [
          {
            name: "No Courses",
            value: "0",
          },
          {
            name: "1 Online Course",
            value: "1019.00",
          },
          {
            name: "2 Online Courses",
            value: "2038",
          },
        ],
      },
    ],
  };
};

var term = function(name) {
  var term;
  if (name.indexOf("A") !== -1 || name.indexOf("B") !== -1) {
    term = schoolTerm(name);
  } else {
    term = workTerm(name);
  }

  _.forEach(term.fields, function(field) {
    if (!field.value) {
      if (field.defaults && field.defaults.length) {
        field.value = field.defaults[0].value;
      } else if (term.presets && term.presets.length) {
        var parts = field.id.split("_");
        var attr = parts[parts.length - 1];
        field.value = term.presets[0].values[attr];
      }

      if (!field.value) {
        field.value = 0;
      }

      field.value = Math.round(field.value * 100) / 100;
    }
  });

  return term;
};

var terms = _.map(terms, term);

var data = {
  years: _.reduce(terms, function(acc, term) {
    var termsPerYear = 3;
    if (acc.length === 0) {
      acc.push([term]);
    } else {
      if (acc[acc.length - 1].length < termsPerYear) {
        acc[acc.length - 1].push(term);
      } else {
        acc.push([term]);
      }
    }
    return acc;
  }, []),
};

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkNhbGN1bGF0b3IuY29udHJvbGxlci5qcyIsIkdyYXBoLmRpcmVjdGl2ZS5qcyIsImRhdGEuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcGxpY2F0aW9uLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIGNhbGN1bGF0b3IgPSBhbmd1bGFyLm1vZHVsZSgnY2FsY3VsYXRvcicsIFsnZmNzYS1udW1iZXInXSk7XG5cbmNhbGN1bGF0b3IuY29udHJvbGxlcignQ2FsY3VsYXRvckNvbnRyb2xsZXInLCBmdW5jdGlvbiAoJHNjb3BlKSB7XG4gICRzY29wZS5kYXRhID0gZGF0YTtcblxuICAkc2NvcGUuYXBwbHlEZWZhdWx0ID0gZnVuY3Rpb24oZmllbGQsIF9kZWZhdWx0KSB7XG4gICAgZmllbGQudmFsdWUgPSBNYXRoLnJvdW5kKF9kZWZhdWx0LnZhbHVlICogMTAwKSAvIDEwMDtcbiAgfTtcblxuICAkc2NvcGUuYXBwbHlQcmVzZXQgPSBmdW5jdGlvbih0ZXJtLCBwcmVzZXQpIHtcbiAgICBfLmZvckVhY2gocHJlc2V0LnZhbHVlcywgZnVuY3Rpb24odmFsdWUsIGF0dHIpIHtcbiAgICAgIHZhciBmaWVsZCA9IF8uZmluZCh0ZXJtLmZpZWxkcywge2lkOiBhdHRyfSk7XG4gICAgICBmaWVsZC52YWx1ZSA9IE1hdGgucm91bmQodmFsdWUgKiAxMDApIC8gMTAwO1xuICAgIH0pO1xuICB9O1xuXG4gICRzY29wZS5zYXZlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHZhbHVlcyA9IF8ubWFwKCRzY29wZS5kYXRhLnllYXJzLCBmdW5jdGlvbih0ZXJtcykge1xuICAgICAgcmV0dXJuIF8ubWFwKHRlcm1zLCBmdW5jdGlvbih0ZXJtKSB7XG4gICAgICAgIHJldHVybiBfLm1hcCh0ZXJtLmZpZWxkcywgZnVuY3Rpb24oZmllbGQpIHtcbiAgICAgICAgICByZXR1cm4gcGFyc2VGbG9hdChmaWVsZC52YWx1ZSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHZhbHVlcyk7XG4gIH07XG5cbiAgJHNjb3BlLmxvYWQgPSBmdW5jdGlvbihqc29uKSB7XG4gICAgdmFyIGxvY2FsID0gXy5jbG9uZSgkc2NvcGUuZGF0YSk7XG4gICAgdHJ5IHtcbiAgICAgIHZhciB2YWx1ZXMgPSBKU09OLnBhcnNlKGpzb24pO1xuXG4gICAgICBfLmZvckVhY2gobG9jYWwueWVhcnMsIGZ1bmN0aW9uKHRlcm1zLCBpKSB7XG4gICAgICAgIF8uZm9yRWFjaCh0ZXJtcywgZnVuY3Rpb24odGVybSwgaikge1xuICAgICAgICAgIF8uZm9yRWFjaCh0ZXJtLmZpZWxkcywgZnVuY3Rpb24oZmllbGQsIGspIHtcbiAgICAgICAgICAgIGZpZWxkLnZhbHVlID0gcGFyc2VGbG9hdCh2YWx1ZXNbaV1bal1ba10pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICAkc2NvcGUuZGF0YSA9IGxvY2FsO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiQ291bGQgbm90IGxvYWQgZGF0YTogXCIsIGUpO1xuICAgIH1cbiAgfTtcblxuICBpZiAod2luZG93LmxvY2F0aW9uLmhhc2gpIHtcbiAgICAkc2NvcGUubG9hZCh3aW5kb3cubG9jYXRpb24uaGFzaC5zbGljZSgxKSk7XG4gIH1cblxuICAkc2NvcGUuJHdhdGNoKCdkYXRhJywgZnVuY3Rpb24obmV3VmFsdWUpIHtcbiAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9ICRzY29wZS5zYXZlKCk7XG4gIH0sIHRydWUpO1xufSk7IiwiY2FsY3VsYXRvci5kaXJlY3RpdmUoJ2dyYXBoJywgZnVuY3Rpb24gKCkge1xuICB2YXIgbWFyZ2luID0ge3RvcDogMjAsIHJpZ2h0OiAyMCwgYm90dG9tOiAzMCwgbGVmdDogNjB9LFxuICAgICAgd2lkdGggPSA3NTAgLSBtYXJnaW4ubGVmdCAtIG1hcmdpbi5yaWdodCxcbiAgICAgIGhlaWdodCA9IDMwMCAtIG1hcmdpbi50b3AgLSBtYXJnaW4uYm90dG9tO1xuXG4gIHJldHVybiB7XG4gICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuICAgICAgdmFyIHggPSBkMy5zY2FsZS5vcmRpbmFsKClcbiAgICAgICAgICAucmFuZ2VSb3VuZEJhbmRzKFswLCB3aWR0aF0sIDAuMSk7XG5cbiAgICAgIHZhciB5ID0gZDMuc2NhbGUubGluZWFyKClcbiAgICAgICAgICAucmFuZ2UoW2hlaWdodCwgMF0pO1xuXG4gICAgICB2YXIgeEF4aXMgPSBkMy5zdmcuYXhpcygpXG4gICAgICAgICAgLnNjYWxlKHgpXG4gICAgICAgICAgLm9yaWVudChcImJvdHRvbVwiKTtcblxuICAgICAgdmFyIHlBeGlzID0gZDMuc3ZnLmF4aXMoKVxuICAgICAgICAgIC5zY2FsZSh5KVxuICAgICAgICAgIC5vcmllbnQoXCJsZWZ0XCIpXG4gICAgICAgICAgLnRpY2tzKDEwLCBcIiRcIik7XG5cbiAgICAgIHZhciBwYXRoLCB4QXhpc0VsZW1lbnQsIHlBeGlzRWxlbWVudCwgYmFycztcblxuICAgICAgdmFyIGxpbmUgPSBkMy5zdmcubGluZSgpXG4gICAgICAgICAgLngoZnVuY3Rpb24oZCkgeyByZXR1cm4geChkLnRlcm0pOyB9KVxuICAgICAgICAgIC55KGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHkoZC50b3RhbCk7IH0pXG4gICAgICAgICAgLmludGVycG9sYXRlKCdtb25vdG9uZScpO1xuXG4gICAgICB2YXIgc3ZnID0gZDMuc2VsZWN0KGVsZW1lbnRbMF0pLmFwcGVuZChcInN2Z1wiKVxuICAgICAgICAuYXR0cihcIndpZHRoXCIsIHdpZHRoICsgbWFyZ2luLmxlZnQgKyBtYXJnaW4ucmlnaHQpXG4gICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodCArIG1hcmdpbi50b3AgKyBtYXJnaW4uYm90dG9tKVxuICAgICAgLmFwcGVuZChcImdcIilcbiAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyBtYXJnaW4ubGVmdCArIFwiLFwiICsgbWFyZ2luLnRvcCArIFwiKVwiKTtcblxuICAgICAgc2NvcGUuJHdhdGNoKCdkYXRhJywgZnVuY3Rpb24gKG5ld1ZhbCwgb2xkVmFsKSB7XG4gICAgICAgIHZhciB0b3RhbCA9IDA7XG5cbiAgICAgICAgdmFyIHBvaW50cyA9IF8uZmxhdHRlbihfLm1hcChkYXRhLnllYXJzLCBmdW5jdGlvbih5ZWFyKSB7XG4gICAgICAgICAgcmV0dXJuIF8ubWFwKHllYXIsIGZ1bmN0aW9uKHRlcm0pIHtcbiAgICAgICAgICAgIHZhciBncm9zcyA9IF8ucmVkdWNlKHRlcm0uZmllbGRzLCBmdW5jdGlvbihhY2MsIGZpZWxkKSB7XG4gICAgICAgICAgICAgIHJldHVybiBhY2MgKyAoKGZpZWxkLm11bHRpcGxpZXIgfHwgMSkgKiAoZmllbGQudmFsdWUgfHwgMCkpO1xuICAgICAgICAgICAgfSwgMCk7XG5cbiAgICAgICAgICAgIHZhciBjbGFzc2VzID0gW107XG4gICAgICAgICAgICBpZiAoZ3Jvc3MgPCAwKSB7XG4gICAgICAgICAgICAgIGNsYXNzZXMucHVzaCgndW5wcm9maXRhYmxlJyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGdyb3NzID4gMCkge1xuICAgICAgICAgICAgICBjbGFzc2VzLnB1c2goJ3Byb2ZpdGFibGUnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgdGVybTogXy5sYXN0KHRlcm0uaWQuc3BsaXQoXCJfXCIpKSxcbiAgICAgICAgICAgICAgZ3Jvc3M6IGdyb3NzLFxuICAgICAgICAgICAgICB0b3RhbDogKHRvdGFsID0gdG90YWwgKyBncm9zcyksXG4gICAgICAgICAgICAgIGNsYXNzZXM6IGNsYXNzZXNcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pKTtcblxuICAgICAgICB4LmRvbWFpbihwb2ludHMubWFwKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudGVybTsgfSkpO1xuICAgICAgICB5LmRvbWFpbihkMy5leHRlbnQocG9pbnRzLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnRvdGFsOyB9KSkucmFuZ2UoW2hlaWdodCwgMF0pLm5pY2UoKTtcblxuICAgICAgICB2YXIgZ3JhbmRUb3RhbCA9IHBvaW50c1twb2ludHMubGVuZ3RoIC0gMV0udG90YWw7XG5cbiAgICAgICAgLy8gIFRPRE86IEZvciBjb2RlIGNsZWFubGluZXNzLCB0aGlzIHNob3VsZG4ndCBiZSBpbiBoZXJlLlxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndG90YWwnKS5pbm5lckhUTUwgPVxuICAgICAgICAgIE1hdGguYWJzKGdyYW5kVG90YWwpLnRvTG9jYWxlU3RyaW5nKFxuICAgICAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBzdHlsZTogJ2N1cnJlbmN5JyxcbiAgICAgICAgICAgICAgY3VycmVuY3k6IFwiQ0FEXCIsXG4gICAgICAgICAgICAgIG1pbmltdW1GcmFjdGlvbkRpZ2l0czogMixcbiAgICAgICAgICAgIH1cbiAgICAgICAgICApLnJlcGxhY2UoXCJDQVwiLCBcIlwiKTtcblxuICAgICAgICBpZiAoZ3JhbmRUb3RhbCA+PSAwKSB7XG4gICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Vhcm5pbmdzJykuY2xhc3NMaXN0LmFkZCgncG9zaXRpdmUnKTtcbiAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZWFybmluZ3MnKS5jbGFzc0xpc3QucmVtb3ZlKCduZWdhdGl2ZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdlYXJuaW5ncycpLmNsYXNzTGlzdC5yZW1vdmUoJ3Bvc2l0aXZlJyk7XG4gICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2Vhcm5pbmdzJykuY2xhc3NMaXN0LmFkZCgnbmVnYXRpdmUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgheEF4aXNFbGVtZW50KSB7XG4gICAgICAgICAgeEF4aXNFbGVtZW50ID0gc3ZnLmFwcGVuZChcImdcIik7XG4gICAgICAgIH1cblxuICAgICAgICB4QXhpc0VsZW1lbnRcbiAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwieCBheGlzXCIpXG4gICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoMCxcIiArIGhlaWdodCArIFwiKVwiKVxuICAgICAgICAgIC50ZXh0KFwiVGVybVwiKVxuICAgICAgICAgIC5jYWxsKHhBeGlzKTtcblxuICAgICAgICBpZiAoIXlBeGlzRWxlbWVudCkge1xuICAgICAgICAgIHlBeGlzRWxlbWVudCA9IHN2Zy5hcHBlbmQoXCJnXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgeUF4aXNFbGVtZW50XG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwieSBheGlzXCIpXG4gICAgICAgICAgICAuY2FsbCh5QXhpcylcbiAgICAgICAgICAuYXBwZW5kKFwidGV4dFwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJyb3RhdGUoLTkwKVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ5XCIsIDYpXG4gICAgICAgICAgICAuYXR0cihcImR5XCIsIFwiMWVtXCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJ0ZXh0LWFuY2hvclwiLCBcImVuZFwiKVxuICAgICAgICAgICAgLnRleHQoXCJEZWJ0IG9yIFByb2ZpdFwiKTtcblxuICAgICAgICBpZiAoIWJhcnMpIHtcbiAgICAgICAgICBiYXJzID0gc3ZnXG4gICAgICAgICAgICAuc2VsZWN0QWxsKFwiLmJhclwiKVxuICAgICAgICAgICAgLmRhdGEocG9pbnRzKVxuICAgICAgICAgICAgLmVudGVyKCkuYXBwZW5kKFwicmVjdFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGJhcnNcbiAgICAgICAgICAuZGF0YShwb2ludHMpXG4gICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gJ2JhciAnICsgKGQuY2xhc3NlcyB8fCAnJyk7IH0pXG4gICAgICAgICAgLmF0dHIoXCJ4XCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHgoZC50ZXJtKTsgfSlcbiAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIHgucmFuZ2VCYW5kKCkpXG4gICAgICAgICAgLmF0dHIoXCJ5XCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIHkoTWF0aC5tYXgoMCwgZC5ncm9zcykpOyB9KVxuICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIE1hdGguYWJzKHkoZC5ncm9zcykgLSB5KDApKTsgfSk7XG5cbiAgICAgICAgaWYgKCFwYXRoKSB7XG4gICAgICAgICAgcGF0aCA9IHN2Zy5hcHBlbmQoXCJwYXRoXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgcGF0aFxuICAgICAgICAgIC5kYXR1bShwb2ludHMpXG4gICAgICAgICAgLnRyYW5zaXRpb24oKVxuICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJsaW5lXCIpXG4gICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyAoeC5yYW5nZUJhbmQoKSAvIDIpICsgXCIsIDApXCIpXG4gICAgICAgICAgLmF0dHIoXCJkXCIsIGxpbmUpO1xuICAgICAgfSwgdHJ1ZSk7XG4gICAgfSxcbiAgfTtcbn0pO1xuICBcbiIsInRlcm1zID0gW1wiMUFcIiwgXCIxQlwiLCAgXCJXVDFcIiwgXCIyQVwiLCAgXCJXVDJcIiwgXCIyQlwiLCAgXCJXVDNcIixcbiAgICAgICAgIFwiM0FcIiwgXCJXVDRcIiwgXCIzQlwiLCAgXCJXVDVcIiwgXCI0QVwiLCAgXCJXVDZcIiwgXCI0QlwiXTtcblxudmFyIHdvcmtQcmVzZXRzID0gZnVuY3Rpb24od29ya1Rlcm1JbmRleCkge1xuICB2YXIgcHJlc2V0cyA9IFtdO1xuICB2YXIgdG90YWxUZXJtcyA9IDY7XG5cbiAgdmFyIHdhdGVybG9vRWFybmluZ3NMb3cgPSAzNTIwO1xuICB2YXIgd2F0ZXJsb29FYXJuaW5nc0hpZ2ggPSA1NjAwO1xuICBwcmVzZXRzLnB1c2goe1xuICAgIG5hbWU6IFwiV2F0ZXJsb29cIixcbiAgICB2YWx1ZXM6IHtcbiAgICAgIGVhcm5pbmdzOiB3YXRlcmxvb0Vhcm5pbmdzTG93ICsgKCh3YXRlcmxvb0Vhcm5pbmdzSGlnaCAtIHdhdGVybG9vRWFybmluZ3NMb3cpIC8gdG90YWxUZXJtcykgKiB3b3JrVGVybUluZGV4LFxuICAgICAgaG91c2luZzogNTAwLFxuICAgIH1cbiAgfSk7XG5cbiAgdmFyIHRvcm9udG9FYXJuaW5nc0xvdyA9IDM1MjA7XG4gIHZhciB0b3JvbnRvRWFybmluZ3NIaWdoID0gNTk2MDtcbiAgcHJlc2V0cy5wdXNoKHtcbiAgICBuYW1lOiBcIlRvcm9udG9cIixcbiAgICB2YWx1ZXM6IHtcbiAgICAgIGVhcm5pbmdzOiB0b3JvbnRvRWFybmluZ3NMb3cgKyAoKHRvcm9udG9FYXJuaW5nc0hpZ2ggLSB0b3JvbnRvRWFybmluZ3NMb3cpIC8gdG90YWxUZXJtcykgKiB3b3JrVGVybUluZGV4LFxuICAgICAgaG91c2luZzogODAwLFxuICAgIH1cbiAgfSk7XG5cbiAgdmFyIHNmRWFybmluZ3NMb3cgPSA3MjYwOyAvLyAgJDM2L2ggKyBob3VzaW5nXG4gIHZhciBzZkVhcm5pbmdzSGlnaCA9IDg3MDA7IC8vICQ0NS9oICsgaG91c2luZ1xuICBwcmVzZXRzLnB1c2goe1xuICAgIG5hbWU6IFwiU2FuIEZyYW5jaXNjbyBCYXkgQXJlYVwiLFxuICAgIHZhbHVlczoge1xuICAgICAgZWFybmluZ3M6IHNmRWFybmluZ3NMb3cgKyAoKHNmRWFybmluZ3NIaWdoIC0gc2ZFYXJuaW5nc0xvdykgLyB0b3RhbFRlcm1zKSAqIHdvcmtUZXJtSW5kZXgsXG4gICAgICBob3VzaW5nOiAyNTAwLFxuICAgIH1cbiAgfSk7XG5cbiAgdmFyIGVDb29wRWFybmluZ3NMb3cgPSAwO1xuICB2YXIgZUNvb3BFYXJuaW5nc0hpZ2ggPSAyMDAwO1xuICBwcmVzZXRzLnB1c2goe1xuICAgIG5hbWU6IFwiRUNvb3AgKGluIFdhdGVybG9vKVwiLFxuICAgIHZhbHVlczoge1xuICAgICAgZWFybmluZ3M6IGVDb29wRWFybmluZ3NMb3cgKyAoKGVDb29wRWFybmluZ3NIaWdoIC0gZUNvb3BFYXJuaW5nc0xvdykgLyB0b3RhbFRlcm1zKSAqIHdvcmtUZXJtSW5kZXgsXG4gICAgICBob3VzaW5nOiA1MDAsXG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gcHJlc2V0cztcbn07XG5cbnZhciBzY2hvb2xUZXJtID0gZnVuY3Rpb24obmFtZSkge1xuICByZXR1cm4ge1xuICAgIGlkOiBuYW1lLFxuICAgIG5hbWU6IFwiVGVybSBcIiArIG5hbWUsXG4gICAgZmllbGRzOiBbXG4gICAgICB7XG4gICAgICAgIGlkOiBcInR1aXRpb25cIixcbiAgICAgICAgbmFtZTogXCJUdWl0aW9uXCIsXG4gICAgICAgIG11bHRpcGxpZXI6IC0xLFxuICAgICAgICB2YWx1ZToge1xuICAgICAgICAgIFwiMUFcIjogIDU4ODMuMDAsXG4gICAgICAgICAgXCIxQlwiOiAgNTg4My4wMCxcbiAgICAgICAgICBcIjJBXCI6ICA1ODgzLjAwLFxuICAgICAgICAgIFwiMkJcIjogIDU3NzEuMDAsXG4gICAgICAgICAgXCIzQVwiOiAgNTc3MS4wMCxcbiAgICAgICAgICBcIjNCXCI6ICA1NjM0LjAwLFxuICAgICAgICAgIFwiNEFcIjogIDU1MDEuMDAsXG4gICAgICAgICAgXCI0QlwiOiAgNTI5OS4wMCxcbiAgICAgICAgfVtuYW1lXSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGlkOiBcImZlZXNcIixcbiAgICAgICAgbmFtZTogXCJTY2hvb2wgRmVlc1wiLFxuICAgICAgICBtdWx0aXBsaWVyOiAtMSxcbiAgICAgICAgdmFsdWU6IHtcbiAgICAgICAgICBcIjFBXCI6IDExMzMuMTUsXG4gICAgICAgICAgXCIxQlwiOiAxMTMzLjE1LFxuICAgICAgICAgIFwiMkFcIjogMTEzMy4xNSxcbiAgICAgICAgICBcIjJCXCI6IDExMzMuMTUsXG4gICAgICAgICAgXCIzQVwiOiAxMTMzLjE1LFxuICAgICAgICAgIFwiM0JcIjogMTEzMy4xNSxcbiAgICAgICAgICBcIjRBXCI6IDExMzMuMTUsXG4gICAgICAgICAgXCI0QlwiOiAxMTMzLjE1LFxuICAgICAgICB9W25hbWVdLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgaWQ6IFwic2Nob2xhcnNoaXBzXCIsXG4gICAgICAgIG5hbWU6IFwiU2Nob2xhcnNoaXBzXCIsXG4gICAgICAgIG11bHRpcGxpZXI6IDEsXG4gICAgICAgIHZhbHVlOiB7XG4gICAgICAgICAgXCIxQVwiOiAyMDAwLjAwLFxuICAgICAgICB9W25hbWVdLFxuICAgICAgICBkZWZhdWx0czogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIG5hbWU6IFwiTm9uZVwiLFxuICAgICAgICAgICAgdmFsdWU6IFwiMFwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgbmFtZTogXCJQcmVzaWRlbnQncyBTY2hvbGFyc2hpcFwiLFxuICAgICAgICAgICAgdmFsdWU6IFwiMjAwMFwiLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBpZDogXCJob3VzaW5nXCIsXG4gICAgICAgIG5hbWU6IFwiSG91c2luZ1wiLFxuICAgICAgICB1bml0OiBcIm1vbnRoXCIsXG4gICAgICAgIG11bHRpcGxpZXI6IC00LFxuICAgICAgICB2YWx1ZToge1xuICAgICAgICAgIFwiMUFcIjogNjcxLjc1LFxuICAgICAgICAgIFwiMUJcIjogNjcxLjc1LFxuICAgICAgICB9W25hbWVdLFxuICAgICAgICBkZWZhdWx0czogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIG5hbWU6IFwiT2ZmLUNhbXB1c1wiLFxuICAgICAgICAgICAgdmFsdWU6IFwiNTAwLjAwXCJcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIG5hbWU6IFwiV2l0aCBQYXJlbnRzXCIsXG4gICAgICAgICAgICB2YWx1ZTogXCIwLjAwXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBuYW1lOiBcIk9mZi1DYW1wdXMgKENoZWFwKVwiLFxuICAgICAgICAgICAgdmFsdWU6IFwiMzUwLjAwXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBuYW1lOiBcIlYxLCBSRVYsIE1LVlwiLFxuICAgICAgICAgICAgdmFsdWU6IFwiNjcxLjc1XCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBuYW1lOiBcIlZlbG9DaXR5XCIsXG4gICAgICAgICAgICB2YWx1ZTogXCI3NzUuNzVcIixcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgaWQ6IFwibGl2aW5nXCIsXG4gICAgICAgIG5hbWU6IFwiTGl2aW5nIENvc3RzXCIsXG4gICAgICAgIGRldGFpbDogXCJGb29kLCBDb2ZmZWUsIGV0Yy5cIixcbiAgICAgICAgbXVsdGlwbGllcjogLTQsXG4gICAgICAgIHZhbHVlOiA0MDAuMDAsXG4gICAgICAgIHVuaXQ6IFwibW9udGhcIixcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGlkOiBcImVhcm5pbmdzXCIsXG4gICAgICAgIG5hbWU6IFwiSW5jb21lXCIsXG4gICAgICAgIGRldGFpbDogXCJQYXJ0LVRpbWUsIEZyZWVsYW5jZSwgZXRjLlwiLFxuICAgICAgICBtdWx0aXBsaWVyOiAtNCxcbiAgICAgICAgdW5pdDogXCJtb250aFwiLFxuICAgICAgfSxcbiAgICBdLFxuICB9O1xufTtcblxudmFyIHdvcmtUZXJtID0gZnVuY3Rpb24obmFtZSkge1xuICB2YXIgaW5kZXggPSBwYXJzZUludChuYW1lLnJlcGxhY2UoXCJXVFwiLCBcIlwiKSwgMTApO1xuICByZXR1cm4ge1xuICAgIGlkOiBuYW1lLFxuICAgIG5hbWU6IFwiV29yayBUZXJtIFwiICsgaW5kZXgsXG4gICAgcHJlc2V0czogd29ya1ByZXNldHMoaW5kZXgpLFxuICAgIGZpZWxkczogW1xuICAgICAge1xuICAgICAgICBpZDogXCJlYXJuaW5nc1wiLFxuICAgICAgICBuYW1lOiBcIkluY29tZVwiLFxuICAgICAgICBtdWx0aXBsaWVyOiA0LFxuICAgICAgICB1bml0OiBcIm1vbnRoXCIsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBpZDogXCJob3VzaW5nXCIsXG4gICAgICAgIG5hbWU6IFwiSG91c2luZ1wiLFxuICAgICAgICBtdWx0aXBsaWVyOiAtNCxcbiAgICAgICAgdW5pdDogXCJtb250aFwiLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgaWQ6IFwibGl2aW5nXCIsXG4gICAgICAgIG5hbWU6IFwiTGl2aW5nIENvc3RzXCIsXG4gICAgICAgIGRldGFpbDogXCJGb29kLCBDb2ZmZWUsIGV0Yy5cIixcbiAgICAgICAgbXVsdGlwbGllcjogLTQsXG4gICAgICAgIHZhbHVlOiA0MDAuMDAsXG4gICAgICAgIHVuaXQ6IFwibW9udGhcIixcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGlkOiBcInR1aXRpb25cIixcbiAgICAgICAgbmFtZTogXCJUdWl0aW9uXCIsXG4gICAgICAgIGRldGFpbDogXCJPbmxpbmUgQ291cnNlc1wiLFxuICAgICAgICBtdWx0aXBsaWVyOiAtMSxcbiAgICAgICAgZGVmYXVsdHM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBuYW1lOiBcIk5vIENvdXJzZXNcIixcbiAgICAgICAgICAgIHZhbHVlOiBcIjBcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIG5hbWU6IFwiMSBPbmxpbmUgQ291cnNlXCIsXG4gICAgICAgICAgICB2YWx1ZTogXCIxMDE5LjAwXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBuYW1lOiBcIjIgT25saW5lIENvdXJzZXNcIixcbiAgICAgICAgICAgIHZhbHVlOiBcIjIwMzhcIixcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICBdLFxuICB9O1xufTtcblxudmFyIHRlcm0gPSBmdW5jdGlvbihuYW1lKSB7XG4gIHZhciB0ZXJtO1xuICBpZiAobmFtZS5pbmRleE9mKFwiQVwiKSAhPT0gLTEgfHwgbmFtZS5pbmRleE9mKFwiQlwiKSAhPT0gLTEpIHtcbiAgICB0ZXJtID0gc2Nob29sVGVybShuYW1lKTtcbiAgfSBlbHNlIHtcbiAgICB0ZXJtID0gd29ya1Rlcm0obmFtZSk7XG4gIH1cblxuICBfLmZvckVhY2godGVybS5maWVsZHMsIGZ1bmN0aW9uKGZpZWxkKSB7XG4gICAgaWYgKCFmaWVsZC52YWx1ZSkge1xuICAgICAgaWYgKGZpZWxkLmRlZmF1bHRzICYmIGZpZWxkLmRlZmF1bHRzLmxlbmd0aCkge1xuICAgICAgICBmaWVsZC52YWx1ZSA9IGZpZWxkLmRlZmF1bHRzWzBdLnZhbHVlO1xuICAgICAgfSBlbHNlIGlmICh0ZXJtLnByZXNldHMgJiYgdGVybS5wcmVzZXRzLmxlbmd0aCkge1xuICAgICAgICB2YXIgcGFydHMgPSBmaWVsZC5pZC5zcGxpdChcIl9cIik7XG4gICAgICAgIHZhciBhdHRyID0gcGFydHNbcGFydHMubGVuZ3RoIC0gMV07XG4gICAgICAgIGZpZWxkLnZhbHVlID0gdGVybS5wcmVzZXRzWzBdLnZhbHVlc1thdHRyXTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFmaWVsZC52YWx1ZSkge1xuICAgICAgICBmaWVsZC52YWx1ZSA9IDA7XG4gICAgICB9XG5cbiAgICAgIGZpZWxkLnZhbHVlID0gTWF0aC5yb3VuZChmaWVsZC52YWx1ZSAqIDEwMCkgLyAxMDA7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gdGVybTtcbn07XG5cbnZhciB0ZXJtcyA9IF8ubWFwKHRlcm1zLCB0ZXJtKTtcblxudmFyIGRhdGEgPSB7XG4gIHllYXJzOiBfLnJlZHVjZSh0ZXJtcywgZnVuY3Rpb24oYWNjLCB0ZXJtKSB7XG4gICAgdmFyIHRlcm1zUGVyWWVhciA9IDM7XG4gICAgaWYgKGFjYy5sZW5ndGggPT09IDApIHtcbiAgICAgIGFjYy5wdXNoKFt0ZXJtXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChhY2NbYWNjLmxlbmd0aCAtIDFdLmxlbmd0aCA8IHRlcm1zUGVyWWVhcikge1xuICAgICAgICBhY2NbYWNjLmxlbmd0aCAtIDFdLnB1c2godGVybSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhY2MucHVzaChbdGVybV0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gYWNjO1xuICB9LCBbXSksXG59O1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9