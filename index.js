var request = require("request");
var url = require("url");
var WSDL = require("wsdl");
var util = require('util');
var xmldom = require("xmldom");

var dom = new xmldom.DOMImplementation();
var document = dom.createDocument();
var parser = new xmldom.DOMParser();
var serialiser = new xmldom.XMLSerializer();

/*
	var suds = new Suds();
or
	var suds = new Suds({
		headers: [],
		uri: "http://www.webservicex.net/globalweather.asmx"
	});
	suds.loadWsdl(file path or url);
	
	suds.callRemote(action, parameters, function (err) {
		...
	});

	
*/

var Suds = module.exports = function Suds(options) {
    options = options || {};
 
    this._headers = options.headers || [];
 
    if (options.request) {
        this._request = options.request;
    }
 
    if (options.uri) {
        this._uri = options.uri;
    }
};

Suds.prototype._request = request;

Suds.prototype.callRemote = function callRemote(uri, action, parameters, cb) {
    console.log(util.inspect([uri, action, parameters, cb]));
    var self = this;
 
    var xml = self.createRequestXml(parameters);
 
    var options = {
        method: "POST",
        uri: uri,
        headers: {
          "content-type": "text/xml; charset=utf-8",
          "soapaction": action
        },
        body: xml
    };
    console.log(util.inspect(xml));
 
    this._request.call(this._request, options, function(err, res, data) {
        if (err) {
            return cb(err + ' ' + res + ' ' + data);
        }
       
        if (res.statusCode !== 200) {
            return cb(Error(
                "invalid status code; expected 200 but got " + res.statusCode + 
                ". Res: " + res + ", Data: " + data
            ));
        }
       
        try {
            var doc = parser.parseFromString(data);  
        } catch (e) {
            return cb(e);
        }
       
        if (!doc) {
            return cb(Error("couldn't parse response"));
        }
       
        self._processResponse(doc.documentElement, function (e, result) {
            if (e) 
                return cb(e);
            return cb(null, result);
        });
    });
};

Suds.prototype._processResponse = function _processResponse(doc, cb) {
    if ((
        doc.namespaceURI !== "http://schemas.xmlsoap.org/soap/envelope/"
    ) || (
        doc.localName !== "Envelope"
    )) {
        cb(new Error("invalid root tag type in response"));
    }
 
    var fault = [].slice.call(doc.childNodes).filter(function(e) {
        return 
            e.namespaceURI === "http://schemas.xmlsoap.org/soap/envelope/" &&
            e.localName === "Fault";
    }).shift();
 
    if (fault)
        return cb(fault);
 
    var body = [].slice.call(doc.childNodes).filter(function(e) {
        return
            e.namespaceURI === "http://schemas.xmlsoap.org/soap/envelope/" && 
            e.localName === "Body";
    }).shift();
 
    if (!body)
        return cb(new Error("couldn't find response body"));
 
    var content = [].slice.call(body.childNodes).filter(function(e) {
        return e.localName;
    }).shift();
 
    cb(null, content);
};

Suds.prototype.createRequestXml = function createRequestXml(parameters) {
    return [
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
        serialiser.serializeToString(
        	this.createRequestDocument(parameters)
        ),
    ].join("\n");
};

Suds.prototype.createRequestDocument = function createRequestDocument(
	parameters
) {
    var doc = dom.createDocument();
 
    var env = doc.createElementNS(
        "http://schemas.xmlsoap.org/soap/envelope/",
        "SOAP-ENV:Envelope"
    );
    doc.appendChild(env);
 
    env.setAttribute(
        "xmlns:SOAP-ENV",
        "http://schemas.xmlsoap.org/soap/envelope/"
    );
    env.setAttribute(
        "xmlns:SOAP-ENC", 
        "http://schemas.xmlsoap.org/soap/encoding/"
    );
    env.setAttribute("xmlns:xsd", "http://www.w3.org/2001/XMLSchema");
    env.setAttribute("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance");
 
    env.setAttributeNS(
        "http://schemas.xmlsoap.org/soap/envelope/", 
        "SOAP-ENV:encodingStyle",
        "http://schemas.xmlsoap.org/soap/encoding/"
    );
 
    this._headers.forEach(function(header) {
        // TODO: add custom headers
    });
 
    var body = doc.createElementNS(
        "http://schemas.xmlsoap.org/soap/envelope/",
        "SOAP-ENV:Body"
    )
    env.appendChild(body);

    var data2xml = function (key, data) {
        var new_element = doc.createElement(key);
        if ((typeof data === 'object') && (data !== null)) {
            if ('length' in data) {
                // array
                data.forEach(function (item) {
                    new_element.appendChild(data2xml(key, item));
                });
            } else {
                // object
                Object.keys(data).forEach(function (item_key) {
                    new_element.appendChild(data2xml(item_key, data[item_key]));
                });
            }
        } else {
            // string or null or something plain
            new_element.appendChild(data);
        }
        return new_element;
    };

    Object.keys(parameters).forEach(function (param_name) {
        var req = doc.createElementNS(
            "http://www.webservicex.net/",
            param_name
        );
        req.appendChild(data2xml(param_name, parameters[param_name]));
        body.appendChild(req);
    });
 
    return doc;
};

var _wsdlOptions = {
    portHandlers: [function(port, element) {
        var soapAddresses = element.getElementsByTagNameNS(
        	"http://schemas.xmlsoap.org/wsdl/soap/",
        	"address"
        );
       
        if (soapAddresses.length === 1) {
            port.soap = {
                address: {
                    location: soapAddresses[0].getAttribute("location"),
                },
            };
        }
    }],
    bindingHandlers: [function(binding, element) {
        var soapBindings = element.getElementsByTagNameNS(
        	"http://schemas.xmlsoap.org/wsdl/soap/",
        	"binding"
        );
       
        if (soapBindings.length === 1) {
            binding.soap = {
                binding: {
                    style: soapBindings[0].getAttribute("style"),
                    transport: soapBindings[0].getAttribute("transport"),
                },
            };
        }
    }],
    operationHandlers: [function(operation, element) {
        var soapOperations = element.getElementsByTagNameNS(
        	"http://schemas.xmlsoap.org/wsdl/soap/",
        	"operation"
        );
       
        if (soapOperations.length === 1) {
            operation.soapOperation = {
                soapAction: soapOperations[0].getAttribute("soapAction"),
            };
        }
       
        var inputElement = element.getElementsByTagNameNS(
        	"http://schemas.xmlsoap.org/wsdl/",
        	"input"
        );
        if (inputElement.length) {
            inputElement = inputElement[0];
           
            var inputBodyElement = inputElement.getElementsByTagNameNS(
                "http://schemas.xmlsoap.org/wsdl/soap/",
                "body"
            );
            if (inputBodyElement.length) {
                inputBodyElement = inputBodyElement[0];
               
                operation.input.soap = {};
               
                if (inputBodyElement.hasAttribute("parts")) {
                    operation.input.soap.parts =
                        inputBodyElement.getAttribute("parts");
                }
               
                if (inputBodyElement.hasAttribute("use")) {
                    operation.input.soap.use =
                        inputBodyElement.getAttribute("use");
                }
               
                if (inputBodyElement.hasAttribute("namespace")) {
                    operation.input.soap.namespace =
                        inputBodyElement.getAttribute("namespace");
                }
               
                if (inputBodyElement.hasAttribute("encodingStyle")) {
                    operation.input.soap.encodingStyle =
                        inputBodyElement.getAttribute("encodingStyle");
                }
            }
        }
       
        var outputElement = element.getElementsByTagNameNS(
        	"http://schemas.xmlsoap.org/wsdl/",
        	"output"
        );
        if (outputElement.length) {
            outputElement = outputElement[0];
           
            var outputBodyElement = outputElement.getElementsByTagNameNS(
                "http://schemas.xmlsoap.org/wsdl/soap/",
                "body"
            );
            if (outputBodyElement.length) {
                outputBodyElement = outputBodyElement[0];
               
                operation.output.soap = {};
               
                if (outputBodyElement.hasAttribute("parts")) {
                    operation.output.soap.parts =
                        outputBodyElement.getAttribute("parts");
                }
               
                if (outputBodyElement.hasAttribute("use")) {
                    operation.output.soap.use =
                        outputBodyElement.getAttribute("use");
                }
               
                if (outputBodyElement.hasAttribute("namespace")) {
                    operation.output.soap.namespace =
                        outputBodyElement.getAttribute("namespace");
                }
               
                if (outputBodyElement.hasAttribute("encodingStyle")) {
                    operation.output.soap.encodingStyle =
                        outputBodyElement.getAttribute("encodingStyle");
                }
            }
        }
    }],
};

Suds.prototype.loadWsdl = function load(wsdlUri, cb) {
    var wsdlOptions = Object.create(_wsdlOptions);
 
    var self = this;
    WSDL.load(wsdlOptions, wsdlUri, function(err, wsdl) {
        if (err) {
            return cb(err);
        }
       
        wsdl.services.forEach(function(service) {
            service.ports.forEach(function(port) {
                if (
                	!port ||
                	!port.soap ||
                	!port.soap.address ||
                	!port.soap.address.location
                ) {
                    return;
                }
               
                var binding = wsdl.bindings.filter(function(binding) {
                    return ((
                        binding.name[0] == port.binding[0]
                    ) && (
                        binding.name[1] == port.binding[1]
                    )) ? true : false;
                }).shift(); // first binding in the array
 
                if (!binding) {
                    return;
                }
               
                binding.operations.forEach(function(operation) {
                    if (
                        !operation ||
                        !operation.soapOperation ||
                        !operation.soapOperation.soapAction
                    ) {
                      return;
                    }

                    var req = [];
                    var res = [];

                    if (binding.soap.binding.style == 'rpc') {
 
                        if (
                            !operation ||
                            !operation.input ||
                            !operation.input.soap ||
                            !operation.input.soap.namespace
                        ) {
                            return;
                        }
                        req.push( 
                            operation.input.soap.namespace,
                            operation.input.name
                        );
                        res.push(
                            operation.output.soap.namespace,
                            operation.output.name
                        );

                    } else {
 
                        // If the style attribute is omitted, 
                        // it is assumed to be "document". -- WSDL spec 3.3
                        if (
                            !operation ||
                            !operation.input ||
                            !operation.input.soap ||
                            !operation.input.soap.use == 'literal'
                        ) {
                            // TODO: use = 'encoding' is not supported
                            return;
                        }
                    }

                    self[operation.name] = self.callRemote.bind(
                        self,
                        port.soap.address.location,
                        operation.soapOperation.soapAction
                    );
                });
            });
        });
       
        return cb();
    });
};
