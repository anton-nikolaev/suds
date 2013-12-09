var assert = require("assert");
var request = require("request");
var Suds = require("../");
var fs = require("fs");
var async = require("async");
var util = require('util');

var wsdlUrl = 'http://www.webservicex.net/geoipservice.asmx?WSDL';

describe("suds", function() {

    var Gsuds = new Suds();

    describe("wsdl", function () {

        it("should load from url", function (done) {
            this.timeout(30000);
            Gsuds.loadWsdl(wsdlUrl, function (err) {
                if (err)
                    return done(err);
                return done();
            });
        });
	
/*
		it("should load from file", function (done) {
			this.timeout(30000);
			
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
*/
    });

    describe("callRemote", function() {
 
        it("should make a call", function(done) {
            this.timeout(30000);
           
            Gsuds.GetGeoIP('http://www.webservicex.net/', {
                GetGeoIP: { IPAddress: "8.8.8.8" }
            }, function (err, res) {
                assert(!err, err);
                //console.log("Result: " + util.inspect(Object.keys(res)));
                return done();
            });
        });
      
    });
});
