/**
 * The login-specific functionality of the platform.
 *
 * @since      1.0.0
 *
 * @package    ServerlessSubscriptionPlatform
 * @subpackage ServerlessSubscriptionPlatform/login
 */

/**
 * The login-specific functionality of the platform.
 *
 * @description
 *
 * @package    ServerlessSubscriptionPlatform
 * @subpackage ServerlessSubscriptionPlatform/login
 * @author     Vasanth Kumararajan <vkumarar@amazon.com>
 */

const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const express = require('express')
const app = express()
const AWS = require('aws-sdk');
const uuidv4 = require('uuid/v4');
const nJwt = require('njwt');
const config = require('./config');

// TODO: Retrieve signing key from a data store or KMS??
const secureRandom = require('secure-random');
const b64string = config.web.base64SigningKey;
const signingKey = Buffer.from(b64string, 'base64') || secureRandom(256, {type: 'Buffer'});   // Create a highly random byte array of 256 bytes
//console.log(signingKey);
//const base64SigningKey = signingKey.toString('base64');
//console.log(base64SigningKey);

let responseStatus = 404;
let responseBody = {'error':{'code':responseStatus,'message':'Not Found'}};

const ENTITLEMENTS_TABLE = 'entitlements-table-dev';
const ROOT_PATH = config.web.rootPath;
const LOGIN_PATH = '/api/login/';
const dynamoDb = new AWS.DynamoDB.DocumentClient();

app.use(function (req, res, next) {
    var d = new Date();
    console.log(`${d.toISOString()}\t${req.method}\t${req.url}\t${req.header('authorization')}`);

    res.setHeader('Content-Type', 'application/json');
    let requestId = uuidv4();
    res.setHeader('x-londonsheriff-Request-Id', requestId);
    // HTTP-only cookies aren't accessible via JavaScript through the Document.cookie property.
    res.setHeader('Set-Cookie',`londonsheriff-Request-Id=${requestId}; HttpOnly; Path=/`);   // Non-production
    // A secure cookie will only be sent to the server when a request is made using SSL and the HTTPS protocol.
    //res.setHeader('Set-Cookie',`londonsheriff-Request-Id=${requestId}; Secure; HttpOnly; Path=/`); // TODO: Production

    bodyParser.json({ strict: false });
    next();
});

// Login endpoint
app.post(LOGIN_PATH, function (req, res) {
    let encodedData = req.headers["authorization"].split(' ');

    if(encodedData[0].toLowerCase().indexOf('basic') !== -1) {
        let decodedData = Buffer.from(encodedData[1], 'base64').toString().split(':');
            let user;
            try {
                console.log(`userId: ${decodedData[0]}`);

                // TODO: Authenticate the user credentials

                const params = {
                    TableName: ENTITLEMENTS_TABLE,
                    Key: {
                      userId: decodedData[0],
                    },
                  }
                // console.log(params);
                  dynamoDb.get(params, (error, result) => {
                    if (error) {
                        responseStatus = 400;
                        responseBody = {'error':{'code':responseStatus,'message':'Could not get entitlement','details':error.message}};
                        console.log(error);
                    }
                    if (result.Item) {
                        var d = new Date();
                        var authenticated = false;
                        // console.log(result.Item);
                        const {userId, name, entitlement, validFrom, validTo, entered, enteredBy} = result.Item;
                        // console.log(authenticated);
                        if(validTo > d.toISOString())
                        {
                            authenticated = true;
                        }
                        console.log(`authenticated: ${authenticated}`);
                        user = { userId, authenticated, name, entitlement, validFrom, validTo, entered, enteredBy };
                    } else {
                        responseStatus = 404;
                        responseBody = {'error':{'code':responseStatus,'message':'User not found','details':error.message}};
                    }

                    if(typeof user !== 'undefined') {
                        if (!user.authenticated) {
                            responseStatus = 401;
                            responseBody = {'error':{'code':responseStatus,'message':'Unauthorized'}};

                        } else {
                            let claims = {
                                iss: ROOT_PATH, // The URL of your service
                                sub: user.userId,      // The UID of the user in your system
                                scope: user.entitlement
                            };

                            //console.log(base64SigningKey);

                            try {
                                let jwt = nJwt.create(claims,signingKey);
                                // console.log(`jwt: ${jwt}`);
                                let token = jwt.compact();
                                console.log(`token: ${token}`);
                                let responseAuthorization = `Bearer ${token}`;
                                res.setHeader('Authorization', responseAuthorization);
                                // HTTP-only cookies aren't accessible via JavaScript through the Document.cookie property.
                                res.setHeader('Set-Cookie',`londonsheriff-Token=${token}; HttpOnly; Path=/`);   // Non-production
                                // A secure cookie will only be sent to the server when a request is made using SSL and the HTTPS protocol.
                                //res.setHeader('Set-Cookie',`londonsheriff-Token=${token}; Secure; HttpOnly; Path=/`); // TODO: Production
                                responseStatus = 200;
                                responseBody = claims;
                            } catch (error) {
                                responseStatus = 403;
                                responseBody = {'error':{'code':responseStatus,'message':'Forbidden','details':error.message}};
                                console.log(error);
                            }
                        }
                    }

                    res.statusCode = responseStatus;
                    res.write(JSON.stringify(responseBody));
                    res.send();
                  });
            } catch (error) {
                responseStatus = 400;
                responseBody = {'error':{'code':responseStatus,'message':'Bad Request','details':error.message}};
                console.log(error);
                res.statusCode = responseStatus;
                res.write(JSON.stringify(responseBody));
                res.send();
            }
        // });
    } else {
        responseStatus = 405;
        responseBody = {'error':{'code':responseStatus,'message':'Method Not Allowed'}};
        res.statusCode = responseStatus;
        res.write(JSON.stringify(responseBody));
        res.send();
    }
})

module.exports.handler = serverless(app);
