# Arkisto to Cloud Serverless

This repository will help you deploy an arkisto site using AWS Elastic Container Service using Fargate Containers with cloudformation

## To get started

Install aws

https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html

#### Run AWS Configure to set up
Run:
```shell script
aws configure

```
Give:
```shell script
AWS Access Key ID [None]: <<Get from console>>
AWS Secret Access Key [None]: <<Get from console>>
Default region name [None]: ap-southeast-2
Default output format [None]: json
```

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`               compile typescript to js
 * `npm run watch`               watch for changes and compile
 * `npm run cdk:deploy`          deploy this stack 
 * `npm run cdk:destroy`         destroy this stack 
 * `npm run cdk:diff`            compare deployed stack with current state
 * `npm run cdk`                 emits the synthesized CloudFormation template
 * `npm run start:ssh`           start ssh service
 * `npm run stop:ssh`            stop ssh service
 * `npm run start:oni`           start oni service
 * `npm run stop:oni`            stop oni service
 * `npm run sync:config`         sync contents of config to site
 * `npm run sync:config`         sync ocfl repository to site
 * `npm run ssh`                 connects via ssh

## Configuration

#### Base Configuration

- Name your ckd stack in `cdk.json` : `context.cloud_stack_id`
- Describe your ckd stack in `cdk.json` : `context.base.description`

#### Locations

Locations can be relative to this repository or absolute

- Specify the location of express code: `context.base.express.location` and `context.base.indexer.location`
- Specify the location of the ocfl repo: `context.base.ocfl`
- Specify the location of the config: `context.base.config`
