"use strict";

import * as path from "path";
import * as tl from "vsts-task-lib/task";
import ContainerConnection from "docker-common/containerconnection";
import * as utils from "./utils";
import * as imageUtils from "docker-common/containerimageutils";
import { ToolRunner } from "vsts-task-lib/toolrunner";

export function run(connection: ContainerConnection): any {
    let commandArguments = tl.getInput("arguments", false); 
    let repositoryName = tl.getInput("repository");
    let imageName = connection.getQualifiedImageName(repositoryName);
    let tags = tl.getDelimitedInput("tags", "\n");
    let promise: Q.Promise<void>;

    if (tags) {
        tags.forEach(tag => {
            let command = connection.createCommand();
            command.arg("run");        
            command.line(commandArguments);
            command.arg(imageName + ":" + tag);
    
            if (promise) {
                promise = promise.then(() =>{
                    connection.execCommand(command);
                })
            }
            else {
                promise = connection.execCommand(command);
            }
        });
    }

    return promise;
}
