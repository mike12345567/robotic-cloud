var accessToken = "da837cbd013221af2cac61eea03e15d8459c49ea";
var functionName = 'makeMove';

module.exports = {
    getDateStringFormat: function(date){
        var today = date;
        var dd = today.getDate();
        var mm = today.getMonth()+1;
        var yyyy = today.getFullYear();
        var hour = today.getHours();
        var min = today.getMinutes();
        var sec = today.getSeconds();
        if (dd<10){
            dd="0"+dd;
        }
        if (mm<10){
            mm="0"+mm;
        }
        if (hour<10){
            hour="0"+hour;
        }
        if (min<10){
            min="0"+min;
        }
        if (sec<10){
            sec="0"+sec;
        }
        return dd+'/'+mm+'/'+yyyy+" "+hour+":"+min+":"+sec;
    },

    dateLog: function(string){
        var today = "["+this.getDateStringFormat(new Date())+"] ";
        console.log(today + string);
    },

    particleGet: function particleGet(url, options) {

    },

    particlePost: function particlePost(deviceID, cmd) {
        var dataString = cmd;

        if (particlePost.length == 1 && cmd != null) {
            for (var arg = 1; arg < arguments.length; arg++) {
                if (arguments[arg] == null) continue;
                dataString += "," + arguments[arg];
            }
        }

        var post_data = querystring.stringify({
            'access_token' : accessToken,
            'arg' : dataString
        });

        // An object of options to indicate where to post to
        var post_options = {
            host: 'https://api.particle.io/v1/devices/' + deviceID,
            port: '80',
            path: '/' + functionName,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(post_data)
            }
        };

        // Set up the request
        var post_req = http.request(post_options, function(res) {
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                console.log('Response: ' + chunk);
            });
        });

        // post the data
        post_req.write(post_data);
        post_req.end();
    },
    accessToken: accessToken
};