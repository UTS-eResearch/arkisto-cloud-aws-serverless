# Arkisto to AWS Serverless

This repository will help you deploy an arkisto site using AWS Elastic Container Service using Fargate Containers with cloudformation

## To get started

Install:
- **aws cli**

    https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html

- **rsync** (Version 3, Your mac may not have the latest version)

    Upgrade so you can sync config files and repository 

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

## Configuration

#### Base Configuration

- Name your ckd stack in `cdk.json` : `context.cloud_stack_id`
- Describe your ckd stack in `cdk.json` : `context.base.description`

#### Locations

Locations can be relative to this repository or absolute

- Specify the location of express code: `context.base.express.location` and `context.base.indexer.location`
- Specify the location of the ocfl repo: `context.base.ocfl`
- Specify the location of the config: `context.base.config`

#### Generate ssh key 

```shell script
mkdir -p key
ssh-keygen -f key/id.rsa -t rsa -C "arkisto" -q -N ""
chmod 644 key/id.rsa
```

#### First Run

Install:
```shell script
npm install
```

Compile typescript in watch mode
```shell script
npm run watch
```

Then deploy
```shell script
npm run cdk:deploy
```

Stop Oni

```shell script
npm run stop:oni
```
This will allow AWS cli to finish.

You will see AWS outputs that the program and you will use

```shell script
npm run get:outputs
```

The output that starts with `oniserviceServiceURL` is your Oni website

### Upload Config and Data

**Docker**

The configuration from docker-compose to docker and aws varies.

- Verify that your docker container config are pointing to localhost. 
This way all the docker containers can talk to each other.

    In express.json 
    - `http://solr:8983` use `http://localhost:8983`
    - `memcached:11211` use `localhost:11211`
    
    In indexer.json
    - `"solrBase": "http://solr:8983/solr/ocfl",` use `"solrBase": "http://localhost:8983/solr/ocfl",`

    This is because if you used docker-compose for Mac. Mac OS cannot use localhost it uses the docker name.
You could also see `host.docker.internal` instead of `localhost`

- Remove `isBot` from the configuration

    It will block AWS health check and the site will never come up

**Sync Configuration**

```shell script
npm run sync:config
```

**Sync OCFL**

```shell script
npm run sync:ocfl
```
Then Start Oni 

```shell script
npm run start:oni
```

## Troubleshooting

**Connect SSH**

```shell script
npm run ssh
```

Folders will be stored in

**Solr**
```shell script
/var/solr/data
```
**Config**
```shell script
/etc/share/config
```
**OCFL**
```shell script
/etc/share/ocfl
```

**Delete Solr data dir**

Connect to the ssh service

```shell script
npm run ssh
```

```shell script
cd /var/solr/data
```

and remove ocfl
```shell script
rm -rf ocfl
```

**Restart Oni 👹**

```shell script
npm run stop:oni
```

It should give a desired task of 0 then AWS will take care of the rest

then start oni again

```shell script
npm run start:oni
```

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
 * `npm run sync:ocfl`           sync ocfl repository to site
 * `npm run ssh`                 connects via ssh
 * `npm run get:sshdns`          prints ssh url
 * `npm run get:outputs`         prints all cdk outputs (loadbalancers, efs drives)

### Using indexer with oni-express (without oni-indexer)

Create a dump directory in config/dump and upload it to the dataingest container in ECS

