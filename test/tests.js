var assert = require("chai").assert;
var request = require("request");
var Suds = require("../");
var fs = require("fs");
var async = require("async");

var wsdlUrl = 'http://www.webservicex.com/globalweather.asmx?WSDL';

describe("suds", function() {
  describe("callRemote", function() {
    it("should make a call", function(done) {
      var suds = new Suds({
        uri: "http://127.0.0.1:5000/",
        urn: "http://test.uchi/srv",
      });

      suds.callRemote("hello", ["world"], function(err, res) {
        if (err) {
          return done(err);
        }

        console.log(res);

        return done();
      });
    });

    it("should make a call to another service", function(done) {
      this.timeout(30000);

      var suds = new Suds({
        uri: "http://www.webservicex.com/globalweather.asmx",
        urn: "http://www.webserviceX.NET",
      });

      suds.callRemote("GetWeather", ["a", "b"], function(err, res) {
        if (err) {
          return done(err);
        }

        console.log(res);

        return done();
      });
    });
	
	it("wsdl from url", function (done) {
        this.timeout(30000);
		var suds = new Suds();
		suds.loadWsdl(wsdlUrl, function (err) {
			if (err)
				return done(err);
			return done();
		});
	});
	
	it("wsdl from file", function (done) {
		this.timeout(30000);
		return done();
		
		var file = '/tmp/.suds.wsdl';
		async.waterfall([function (step) {
			request(wsdlUrl, function (err, res, body) {
				step(err, body);
			});

		}, function (body, step) {
			fs.writeFile(file, body, function (err) {
				step(err);
			});

		}, function (step) {
			var suds = new Suds();
			suds.loadWsdl(file, function (err) {
				step(err);
			});

		}], function (err) {
			fs.exists(file, function (yes) {
				if (yes)
					fs.unlink(file, function () { done (err); });
				else
					done(err);
			});
		});
	});

  });
});
