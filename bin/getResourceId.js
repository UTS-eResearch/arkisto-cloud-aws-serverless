#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const args = process.argv;
if (!args[3]) {
  console.log('please input service/cluster');
}
if (args[2]) {
  const res = args[3];
  const resourcesFile = path.join(process.cwd(), 'helpers', `${res}s.json`);
  const resources = JSON.parse(fs.readFileSync(resourcesFile).toString());
  let resource = '';
  let objName = `${res}Arns`;
  let identifier;
  if (args[4]) {
    identifier = args[4];
  } else {
    identifier = args[2];
  }
  if (resources[objName]) {
    resource = resources[objName].find((c) => {
      return c.includes(identifier);
    });
    const resourceName = resource.split(`${res}/`)[1];
    console.log(resourceName);
    process.exit(0);
  } else {
    console.log('resource not found');
    process.exit(-1);
  }

} else {
  console.log('please input file template argument');
  process.exit(-1)
}
