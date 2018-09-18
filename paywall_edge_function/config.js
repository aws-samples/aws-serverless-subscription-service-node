/**
 * The config-specific functionality of the platform.
 *
 * @link       Link_to_the_blog_post 
 * @since      1.0.0
 *
 * @package    ServerlessSubscriptionPlatform
 * @subpackage ServerlessSubscriptionPlatform/config
 */

/**
 * The config-specific functionality of the platform.
 *
 * @description
 *
 * @package    ServerlessSubscriptionPlatform
 * @subpackage ServerlessSubscriptionPlatform/config
 * @author     Vasanth Kumararajan <vkumarar@amazon.com>
 */

let config = {};

config.web = {};

//create a base64 signing key
config.web.base64SigningKey = 'your_signing_key';
//This is from the CloudFromation output
config.web.rootPath = 'https://api_gw_endpoint.execute-api.us-east-1.amazonaws.com/dev';
config.web.hostName = 'api_gw_endpoint.execute-api.us-east-1.amazonaws.com';
config.web.headlessCmsUrl = 'https://api_gw_endpoint.execute-api.us-east-1.amazonaws.com/dev/articlesexportall';

module.exports = config;
