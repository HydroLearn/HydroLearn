// COLOR Helper functions
// Manager for some common tasks with color manipulation
var COLOR_MGR = new (function(){

    // custom color object for use in calculations
    this.Color = function (_r, _g, _b) {
        var r, g, b;
        var setColors = function (_r, _g, _b) {
            r = _r;
            g = _g;
            b = _b;
        };
        setColors(_r, _g, _b);

        this.getColors = function () {
            var colors = { r: r, g: g, b: b };
            return colors;
        };

        this.toRGB = function () {
            return "rgb(" + r + "," + g + "," + b + ")";
        }


        this.toRGBA = function (opacity) {
            return "rgba(" + r + "," + g + "," + b + "," + opacity + ")";
        }

    }

    // method to interpolate colors between 2 colors
    // given a start value, end value, number of steps, and current step count
    this.Interpolate = function (start, end, steps, count) {
        var s = start,
            e = end,
            final = s + (((e - s) / steps) * count);
        return Math.floor(final);
    }

    // method to keep the color numbers within the range of 0-255
    //
    this.colorBoundsInt = function (num) {
        if (num <= 0) return 00;
        else if (num >= 255) return 255;
        else return parseInt(num);
    }

    // method to return a 0-padded string representation of a number
    // of length 'length'
    this.pad = function (number, length) {

        var str = '' + number;
        while (str.length < length) {
            str = '0' + str;
        }

        return str;

    }

    // method to convert r,g,b values to a hex representation
    this.RGB_to_HEX = function (r, g, b) {
        return "#" + this.pad(this.colorBoundsInt(r).toString(16), 2) + this.pad(this.colorBoundsInt(g).toString(16), 2) + this.pad(this.colorBoundsInt(b).toString(16), 2);

    }

    // method to convert hex value to rgb values
    this.HEX_to_RGB = function (hex_val) {

        // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
        var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        var hex = hex_val.replace(shorthandRegex, function (m, r, g, b) {
            return r + r + g + g + b + b;
        });

        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? new this.Color(parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)) : null;

    }

    // method to return an array of interpolated colors between 3 colors
    //  a start color, middle stop, and stop color
    //      defaults to start=blue, mid=yellow, stop=red
    this.Color_Range = function (color_count, start_color, mid_color, stop_Color) {

        var color_collection = [];

        if (!!!start_color) start_color = new this.Color(28, 117, 187);
        if (!!!mid_color) mid_color = new this.Color(225, 255, 0);
        if (!!!stop_Color) stop_Color = new this.Color(255, 0, 0);


        var start = start_color;
        var end = mid_color;

        for (var i = 0; i < color_count; i++) {
            var val = i / (color_count - 1) * 100;

            if (val > 50) {
                start = mid_color;
                end = stop_Color;
                val = val % 51;
            }
            var startColors = start.getColors(),
                endColors = end.getColors();
            var r = this.Interpolate(startColors.r, endColors.r, 50, val);
            var g = this.Interpolate(startColors.g, endColors.g, 50, val);
            var b = this.Interpolate(startColors.b, endColors.b, 50, val);

            var hexVal = this.RGB_to_HEX(r, g, b);
            color_collection.push(hexVal);

        }

        return color_collection;

    }

})()
