"use strict";

import path = require('path');
import * as tl from "vsts-task-lib/task";
import GenericAuthenticationTokenProvider from "docker-common/registryauthenticationprovider/genericauthenticationtokenprovider";
import RegistryAuthenticationToken from "docker-common/registryauthenticationprovider/registryauthenticationtoken";
import ContainerConnection from 'docker-common/containerconnection';
import Q = require('q');

tl.setResourcePath(path.join(__dirname, 'task.json'));

// ~~ logging all inputs for debugging
console.log("_________________________________________________________\nlogging all inputs for debugging\n_________________________________________________________");
console.log("containerRegistries: " + tl.getInput("containerRegistries"));
console.log("repository: " + tl.getInput("repository"));
console.log("command: " + tl.getInput("command"));
console.log("dockerFile: " + tl.getInput("dockerFile"));
console.log("buildContext: " + tl.getInput("buildContext"));
console.log("tags: " + tl.getInput("tags"));
console.log("imageToTag: " + tl.getInput("imageToTag"));
console.log("arguments: " + tl.getInput("arguments"));
console.log("_________________________________________________________\nlogging all inputs for debugging\n_________________________________________________________");

const environmentVariableMaximumSize = 32766;

let containerRegisitry = tl.getInput("containerRegistry");
let authenticationProvider = new GenericAuthenticationTokenProvider(containerRegisitry);        
var registryAuthenticationToken = authenticationProvider.getAuthenticationToken();

// Connect to any specified container registry
var connection = new ContainerConnection();
connection.open(null, registryAuthenticationToken);

// Take the specified command
var command = tl.getInput("command", true).toLowerCase();
// If no command is specified, default to buildAndPush
if (!command) {
    command = "buildAndPush";
}
/* tslint:disable:no-var-requires */ // ~~ see what this is for

var dockerCommandMap = {
    "buildAndPush": "./dockerbuildandpush",
    "build": "./dockerbuild",
    "tag": "./dockertag",
    "push": "./dockerpush",
    "run": "./dockerrun",
    "login": "./dockerlogin",
    "logout": "./dockerlogout"
}

// ~~ see how telemetry should be handled
// var telemetry = {
//     registryType: registryType,
//     command: command
// };

// console.log("##vso[telemetry.publish area=%s;feature=%s]%s",
//     "TaskEndpointId",
//     "DockerV1",
//     JSON.stringify(telemetry));

var commandImplementation = require("./dockercommand");
if (command in dockerCommandMap) {
    commandImplementation = require(dockerCommandMap[command]);
}

var result = "";
commandImplementation.run(connection, (pathToResult) => result += ("r\n" + pathToResult))
/* tslint:enable:no-var-requires */
.fin(function cleanup() {
    if (command !== "login") {
        connection.close();
    }
})
.then(function success() {
    var commandOutputLength = result.length;
    if (commandOutputLength > environmentVariableMaximumSize) {
        tl.warning(tl.loc('OutputVariableDataSizeExceeded', commandOutputLength, environmentVariableMaximumSize));
    } else {
        tl.setVariable("DockerOutput", result);
    }

    tl.setResult(tl.TaskResult.Succeeded, "");
}, function failure(err) {
    tl.setResult(tl.TaskResult.Failed, err.message);
})
.done();