BigNumber.config({ EXPONENTIAL_AT : 1e+9 });

var calculatorApp = angular.module('calculatorApp', [])
    .run(function() {
        FastClick.attach(document.body);
    });


calculatorApp.controller('CalculatorCtrl', function ($scope, $window, $timeout) {
    angular.element($window).bind('resize',function(){
        $scope.getSum();
    });

    $scope.updateAvailable = false;

    $timeout(function() {
        if (!window.applicationCache) return false;

        if (window.applicationCache.status == window.applicationCache.UPDATEREADY) {
            return true;
        } else {
            console.log("listening for update ready");
            window.applicationCache.addEventListener('updateready', function(e) {
                if (window.applicationCache.status == window.applicationCache.UPDATEREADY) {
                    console.log("notified we are now ready for update");
                    return true;
                }
            });
        }
    }, 2000).then(function(val) {
        if (val) { $scope.updateAvailable = true; }
    });

    var pointCount = 0;
    function makePushNumberHandler(num) {
        return function() {
            var basedic = {type: "number", value: -1, text: "!"};
            switch($scope.state) {
                case "showing-answer":
                    basedic.value = new BigNumber(num);
                    basedic.text = basedic.value.toString();
                    $scope.sum = [basedic];
                    break;
                case "number":
                case "number-continue":
                    if ($scope.sum.length === 0) {
                        basedic.value = new BigNumber(num);
                        basedic.text = basedic.value.toString();
                        $scope.sum.push(basedic);
                    } else {
                        var last = $scope.sum.pop();
                        last.value = last.value.times(10).plus(num);
                        basedic.value = last.value;
                        basedic.text = last.value.toString();
                        $scope.sum.push(basedic);
                    }
                    break;
                case "symbol":
                    basedic.value = new BigNumber(num); 
                    basedic.text = basedic.value.toString();
                    $scope.sum.push(basedic);
                    break;
                case "point":
                    if ($scope.sum.length === 0) {
                        basedic.value = new BigNumber(0);
                        basedic.text = basedic.value.toString();
                        $scope.sum.push(basedic);
                    } else {
                        var lastd = $scope.sum.pop();
                        var frac = (new BigNumber(10)).toPower(pointCount+1);
                        var add = (new BigNumber(num)).dividedBy(frac);
                        lastd.value = lastd.value.plus(add);
                        basedic.value = lastd.value;
                        basedic.text = lastd.value.toString();
                        $scope.sum.push(basedic);
                    }
                    pointCount += 1;
                    break;
                default:
                    console.log("unexpected state", $scope.state);
            }
            if ($scope.state == "point") {
                // leave it as point
            } else if ($scope.state == "showing-answer") {
                $scope.state = "number";
            } else {
                if ($scope.sum.length > 2) {
                    $scope.state = "number-continue";
                } else {
                    $scope.state ="number";
                }
            }
        };
    }

    $scope.getSum = function(opts) {
        var out = [];
        $scope.sum.forEach(function(s) { out.push(s.text); });
        var o = out.join(" ");
        if (opts && opts.leaveFontSizeAlone) {
            // don't alter font size
        } else {
            // calculate font size for display
            var sp = document.createElement("span");
            sp.style.position = "absolute";
            sp.style.top = "-1000px";
            sp.style.backgroundColor = "red";
            sp.appendChild(document.createTextNode(o));
            document.body.appendChild(sp);
            var fsize, fontUnit;
            var sumel = document.getElementById("sum");
            var maxw = sumel.offsetWidth;
            var portrait = window.matchMedia("(max-aspect-ratio: 11/12)").matches;
            var landscape = window.matchMedia("(min-aspect-ratio: 12/11)").matches;
            var square = window.matchMedia("(max-aspect-ratio: 12/11) and (min-aspect-ratio: 11/12)").matches;
            if (square) {
                fsize = 12; fontUnit = "vw";
            } else if (landscape) {
                fsize = 20; fontUnit = "vh";
            } else { //portrait
                fsize = 20; fontUnit = "vw";
            }

            while (true) {
                sp.style.fontSize = fsize + fontUnit;
                if (sp.offsetWidth < maxw) {
                    sumel.style.fontSize = fsize + fontUnit;
                    break;
                }
                fsize -= 1;
                if (fsize <= 1) {
                    break; // don't loop forever
                }
            }
            document.body.removeChild(sp);
        }
        return o;
    };

    $scope.isDisabled = function(button) {
        var isd = true;
        button.enabledStates.forEach(function(s) {
            if (s == $scope.state) { isd = false; }
        });
        return isd;
    };

    $scope.previous_sums = [];
    $scope.buttons = [];
    $scope.state = "number";
    $scope.sum = [];
    for (var i=0; i<10; i++) {
        $scope.buttons.push({
            text: i,
            id: "b" + i,
            className: "number",
            enabledStates: ["number", "number-continue", "symbol", "point", "showing-answer"],
            handler: makePushNumberHandler(i)
        });
    }
    [["×", "times"], ["+", "plus"], ["÷", "dividedBy"], 
        ["-", "minus"]].forEach(function(sy) {
        $scope.buttons.push({
            text: sy[0], 
            enabledStates: ["number", "number-continue", "point", "showing-answer"],
            id: "b" + sy[1],
            className: "symbol",
            handler: function() {
                $scope.sum.push({
                    type: "symbol",
                    value: sy[1],
                    text: sy[0]
                });
                $scope.state = "symbol";
            }
        });
    });
    $scope.buttons.push({
        text: "=", 
        enabledStates: ["number-continue", "point"],
        id: "bequal",
        className: "symbol",
        handler: function() {
            var cursum = $scope.getSum({leaveFontSizeAlone: true});
            var l = $scope.previous_sums.length - 5;
            if (l<0) { l=0; }
            $scope.previous_sums = $scope.previous_sums.slice(l);
            var a = $scope.sum.shift().value, fn, b;
            while ($scope.sum.length > 0) {
                fn = $scope.sum.shift().value;
                b = $scope.sum.shift().value;
                a = a[fn](b);
            }
            $scope.state = "showing-answer";
            $scope.sum = [{type:"number", value:a, text: a.toString()}];
            $scope.previous_sums.push(cursum + " = " + a.toString());
            setTimeout(function() {
                var lc = document.querySelector("li:last-child");
                if (lc) lc.scrollIntoView();
            }, 500);
        }
    });
    $scope.buttons.push({
        text: ".",
        id: "bpoint",
        enabledStates: ["number-continue", "number"],
        className: "number",
        handler: function() {
            $scope.state = "point";
            pointCount = 0;
        }
    });
});
