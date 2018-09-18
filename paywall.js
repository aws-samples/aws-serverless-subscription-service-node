/**
 * The paywall-specific functionality of the platform.
 *
 * @since      1.0.0
 *
 * @package    ServerlessSubscriptionPlatform
 * @subpackage ServerlessSubscriptionPlatform/paywall
 */

/**
 * The paywall-specific functionality of the platform.
 *
 * This lambda function is associated with viewer-request event
 * type, example shows verifying the JWT, makes two separate call
 * to hello api and headless cms, combines the response and
 * personalized response is returned at edge. Also does the pass
 * through for remaining use cases, such as login and default
 * view.
 *
 * @package    ServerlessSubscriptionPlatform
 * @subpackage ServerlessSubscriptionPlatform/paywall
 * @author     Prateek Yadav <prateeky@amazon.com>
 * @author     Vasanth Kumararajan <vkumarar@amazon.com>
 */

'use strict';

const http = require('http');
const https = require('https');
const nJwt = require('njwt');
const config = require('./config');

const HOST_NAME = config.web.hostName;
const TEMPLATE_URL = config.web.headlessCmsUrl;

function parseCookies(headers) {
    const parsedCookie = {};
    if (headers.cookie) {
        headers.cookie[0].value.split(';').forEach((cookie) => {
            if (cookie) {
                const parts = cookie.split('=');
                if (parts[1]) {
                    parsedCookie[parts[0].trim()] = parts[1].trim();
                }
            }
        });
    }
    return parsedCookie;
}

exports.handler = (event, context, callback) => {
    const request = event.Records[0].cf.request;
    console.log(JSON.stringify(request));
    const parsedCookies = parseCookies(request.headers);

    if (parsedCookies && parsedCookies['londonsheriff-Token'] && request.uri == "/articles") {
        console.log('Cookie present');

        const jwtToken = parsedCookies['londonsheriff-Token'];
        const b64string = config.web.base64SigningKey;
        const verifiedToken = nJwt.verify(jwtToken, b64string);

        // TODO: Decide what to do when the passed token is not valid or expired

        const userDetails = jwtToken.split('.')[1];
        console.log(userDetails);
        console.log(Buffer.from(userDetails, 'base64').toString('ascii'));
        let userToken = JSON.parse(Buffer.from(userDetails, 'base64').toString('ascii'));
        const userName = userToken.sub;
        const scope = userToken.scope;

        let templateUrl = TEMPLATE_URL;

        http.get(templateUrl, (res) => {
            var content = '';
            res.on('data', (chunk) => { content += chunk; });
            res.on('end', () => {
                console.log(content);
                let responseBody = [];
                var responseWithTags = {};
                let jsonBody = JSON.parse(content);
                // Go through the scope to find out what this user is intersted in
                for (var key in scope) {
                    if (scope.hasOwnProperty(key) && key != 'language') {
                        for (var i = 0; i < jsonBody.length; i++) {
                            let article = jsonBody[i];
                            if (article['field_tags'].indexOf(key) > 0) {
                                responseBody.push({'title': article['title'], 'body': article['body']})
                            }
                        }
                        responseWithTags[key] = responseBody;
                    }
                    responseBody = [];
                }
                const options = {
                    hostname: HOST_NAME,
                    port: 443,
                    protocol: 'https:',
                    path: '/dev/api/hello',
                    method: 'GET',
                    headers: {
                        'Cookie': request.headers.cookie[0].value
                    }
                };
                console.log("cookie " + request.headers.cookie)
                var req = https.request(options, function(res) {
                    var content = '';
                    res.on('data', (chunk) => { content += chunk; });
                    res.on('end', () => {
                        console.log("got hello: " + content);
                        const jsonBody = JSON.parse(content);
                        responseWithTags['hello'] = jsonBody[scope['language']];
                        const response = {
                            status: '200',
                            statusDescription: 'OK',
                            body: JSON.stringify(responseWithTags),
                            bodyEncoding: 'text',
                        };
                        callback(null, response);
                    });
                });
                req.end();
            });
        });
    } else if (request.uri == '/login' || request.uri.startsWith('/api/login')) {
        console.log('login uri found');
        if (!request.headers.authorization) {
            console.log('No auth header');
            const options = {
                hostname: HOST_NAME,
                port: 443,
                protocol: 'https:',
                path: '/dev/login',
                method: 'GET'
            };

            var req = https.request(options, function(res) {
                var content = '';
                res.on('data', (chunk) => { content += chunk; });
                res.on('end', () => {
                    console.log(content);
                    const response = {
                        status: '200',
                        statusDescription: 'OK',
                        body: content,
                        bodyEncoding: 'text',
                    };
                    callback(null, response);
                });
            });
            req.end();
        } else {
            const options = {
                hostname: HOST_NAME,
                port: 443,
                protocol: 'https:',
                path: '/dev/api/login',
                method: 'POST',
                headers: {
                    'Authorization': request.headers.authorization[0].value
                }
            };

            var req = https.request(options, function(res) {
                var content = '';
                res.on('data', (chunk) => { content += chunk; });
                res.on('end', () => {
                    const response = {
                        status: res.statusCode,
                        statusDescription: 'OK',
                        body: content,
                        bodyEncoding: 'text',
                        headers: {
                            'set-cookie': [{
                                key: 'set-cookie',
                                value: res.headers['set-cookie'],
                            }]
                        },
                    };
                    callback(null, response);
                });
            });
            req.end();
        }
    } else {
        let templateUrl = TEMPLATE_URL;
        console.log('default case');
        http.get(templateUrl, (res) => {
            var content = '';
            res.on('data', (chunk) => { content += chunk; });
            res.on('end', () => {
                console.log(content);
                let jsonBody = JSON.parse(content);
                let responseEdge = [];
                let responseSecurity = [];
                let responseCompute = [];
                for (var i = 0; i < 3; i++) {
                    let article = jsonBody[i];
                    if (article['field_tags'].indexOf("edge") > 0) {
                        responseEdge.push({'title': article['title'], 'body': article['body']})
                    }
                    if (article['field_tags'].indexOf("security") > 0) {
                        responseSecurity.push({'title': article['title'], 'body': article['body']})
                    }
                    if (article['field_tags'].indexOf("compute") > 0) {
                        responseCompute.push({'title': article['title'], 'body': article['body']})
                    }
                }

                let responseBody = {'hello': 'hello', 'edge': responseEdge, 'security': responseSecurity, 'compute': responseCompute };
                console.log(JSON.stringify(responseBody));
                const response = {
                    status: '200',
                    statusDescription: 'OK',
                    body: JSON.stringify(responseBody),
                    bodyEncoding: 'text',
                };
                callback(null, response);
            });
        });
    }

};
