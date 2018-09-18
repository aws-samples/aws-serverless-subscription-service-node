/**
 * The entitlements-specific functionality of the platform.
 *
 * @since      1.0.0
 *
 * @package    ServerlessSubscriptionPlatform
 * @subpackage ServerlessSubscriptionPlatform/entitlements
 */

/**
 * The entitlements-specific functionality of the platform.
 *
 * @description
 *
 * @package    ServerlessSubscriptionPlatform
 * @subpackage ServerlessSubscriptionPlatform/entitlements
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

const ENTITLEMENTS_TABLE = 'entitlements-table-dev';
const ROOT_PATH = config.web.rootPath;
const ENTITLEMENTS_PATH = '/api/entitlements/';
const ENTITLEMENTS_SCOPE = 'entitlement-management';
const dynamoDb = new AWS.DynamoDB.DocumentClient({
    convertEmptyValues: true,
});

app.use(bodyParser.json({ strict: false }));

// Get all active entitlements endpoint
app.get(ENTITLEMENTS_PATH, function (req, res) {
    var d = new Date();
    const params = {
        TableName: ENTITLEMENTS_TABLE,
        FilterExpression: 'validTo > :timestamp',
        ExpressionAttributeValues: {":timestamp":d.toISOString()},
        Limit: 1000
    }
    
    dynamoDb.scan(params, (error, result) => {
        if (error) {
            console.log(error)
            res.status(400).json({ error: 'Could not get all entitlements' })
        } else if (result) {
            res.json(result)
        }
    })
})

// Create Entitlement endpoint
app.post(ENTITLEMENTS_PATH, function (req, res) {

    if(!req.body || req.body.length === 0)
    {
        res.status(400).json({ error: 'Request body not found' })
    }
    else if(req.body.length > 4e5)
    {
        res.status(413).json({ error: 'Payload Too Large' });
    }
  const { userId, name, entitlement, validFrom, validTo, entered, enteredBy } = req.body;
  validate(userId, res, name, entitlement, validFrom, validTo, entered, enteredBy);

  const params = {
    TableName: ENTITLEMENTS_TABLE,
    Item: {
      userId: userId,
      name: name,
      entitlement: entitlement,
      validFrom: validFrom,
      validTo: validTo,
      entered: entered,
      enteredBy: enteredBy,
    },
  };

  dynamoDb.put(params, (error) => {
    if (error) {
      console.log(error);
      res.status(400).json({ error: 'Could not create entitlement' });
    }
    var uri = ROOT_PATH + ENTITLEMENTS_PATH + userId;
    res.status(201).json({ userId, uri, name, entitlement, validFrom, validTo, entered, enteredBy });
  });
})

// Get Entitlement endpoint
app.get(ENTITLEMENTS_PATH+':userId', function (req, res) {
    const params = {
      TableName: ENTITLEMENTS_TABLE,
      Key: {
        userId: req.params.userId,
      },
    }
  
    dynamoDb.get(params, (error, result) => {
      if (error) {
        console.log(error);
        res.status(400).json({ error: 'Could not get entitlement' });
      }
      if (result.Item) {
        const {userId, name, entitlement, validFrom, validTo, entered, enteredBy} = result.Item;
        res.json({ userId, name, entitlement, validFrom, validTo, entered, enteredBy });
      } else {
        res.status(404).json({ error: "Entitlement not found" });
      }
    });
  })

// Update Entitlement endpoint
app.put(ENTITLEMENTS_PATH+':userId', function (req, res) {

    if(!req.body || req.body.length === 0)
    {
        res.status(400).json({ error: 'Request body not found' })
    }
    else if(req.body.length > 4e5)
    {
        res.status(413).json({ error: 'Payload Too Large' });
    }
    const { name, entitlement, validFrom, validTo, entered, enteredBy } = req.body;
    validate(req.params.userId, res, name, entitlement, validFrom, validTo, entered, enteredBy);
  
    const params = {
      TableName: ENTITLEMENTS_TABLE,
      Key: {
        userId: req.params.userId,
      },
      UpdateExpression: 'set #n = :name, entitlement = :entitlement, validFrom = :validFrom, validTo = :validTo, entered = :entered, enteredBy = :enteredBy',
      ExpressionAttributeNames: {
          '#n': 'name'
      },
      ExpressionAttributeValues: {
        ':name': name,
        ':entitlement': entitlement,
        ':validFrom': validFrom,
        ':validTo': validTo,
        ':entered': entered,
        ':enteredBy': enteredBy,
      },
    };
  
    dynamoDb.update(params, (error, data) => {
      if (error) {
        console.log(error);
        res.status(400).json({ error: 'Could not update entitlement' });
      } else {
        res.status(202).json(JSON.stringify(data, null, 2));
      }
    });
  })

  // Update Entitlement endpoint
app.delete(ENTITLEMENTS_PATH+':userId', function (req, res) {

    var d = new Date();
    const params = {
      TableName: ENTITLEMENTS_TABLE,
      Key: {
        userId: req.params.userId,
      },
      UpdateExpression: 'set validTo = :validTo',
      ExpressionAttributeValues: {
        ':validTo': d.toISOString(),
        },
    };
  
    dynamoDb.update(params, (error, data) => {
      if (error) {
        console.log(error);
        res.status(400).json({ error: 'Could not delete entitlement' });
      } else {
        res.status(202).json(JSON.stringify(data, null, 2));
      }
    });
  })

function validate(userId, res, name, entitlement, validFrom, validTo, entered, enteredBy) {
    if (typeof userId !== 'string') {
        res.status(400).json({ error: '"userId" must be a string' });
    }
    else if (typeof name !== 'string') {
        res.status(400).json({ error: '"name" must be a string' });
    }
    else if (typeof entitlement !== 'object') {
        res.status(400).json({ error: '"entitlement" must be a object' });
    }
    else if (isNaN(Date.parse(validFrom))) {
        res.status(400).json({ error: '"validFrom" must be a date' });
    }
    else if (isNaN(Date.parse(validTo))) {
        res.status(400).json({ error: '"validTo" must be a date' });
    }
    else if (isNaN(Date.parse(entered))) {
        res.status(400).json({ error: '"entered" must be a date' });
    }
    else if (typeof enteredBy !== 'string') {
        res.status(400).json({ error: '"enteredBy" must be a string' });
    }
}

module.exports.handler = serverless(app);
