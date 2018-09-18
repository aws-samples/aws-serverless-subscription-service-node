# Building Subscription Service

## Summary 

This is the code example for the blog post [Building Serverless Subscription Service using Lambda@Edge](https://aws.amazon.com/blogs/networking-and-content-delivery/building-a-serverless-subscription-service-using-lambdaedge) 
Our example application supports providing a custom experience for website visitors who sign in to the site, so we start by authenticating users when they navigate to the website in their browser. 

## Step-by-Step Setup Guide

-  First, install the serverless framework by following the instructions at this link: https://serverless.com/framework/docs/providers/aws/guide/quick-start/

```sh
$ npm install -g serverless
$ git pull https://github.com/aws-samples/aws-serverless-subscription-service-node.git
$ cd to the repository folder
$ npm install package.json --save
$ serverless deploy -v
```

-  In the CloudFormation console, when the application is complete, click the output URL to verify the deployment.

-  In the paywall_edge_function folder, update the config.js file using the CloudFormation output. 

-  Update the config.js by replacing cloudfront-distro-id with your CloudFront distribution ID. 

```sh
config.web.rootPath = 'https://cloudfront-distro-id.execute-api.us-east-1.amazonaws.com/dev';
config.web.hostName = 'cloudfront-distro-id.execute-api.us-east-1.amazonaws.com';
config.web.headlessCmsUrl = 'https://cloudfront-distro-id.execute-api.us-east-1.amazonaws.com/dev/articlesexportall';
```

-  After you update the config.js file, create the Lambda zip file by using following commands:

```sh
npm install package.json --save
zip paywall.zip *
```
- More information about how to create a Lambda deployment package can be found in our [documentation](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-create-deployment-pkg.html)

-  In the AWS Lambda console, create a new Lambda function. Use paywall.zip as the codebase for the function.

-  In the CloudFront console, create a distribution following the steps in the blog post.

- Under Add triggers, choose CloudFront, and then add viewer-request triggers for /login, /api/login, and /articles by adding cache behaviors for each one. You can find step-by-step instructions in our [documentation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-edge-add-triggers.html)

- You can also refer the screenshots included in screenshots directory in the repository.

