"use strict";

import * as fs from "fs";
import * as tl from "vsts-task-lib/task";
import ContainerConnection from "docker-common/containerconnection";
import * as Q from 'q';

function dockerTag(connection: ContainerConnection, sourceImage: string, targetImage: string): Q.Promise<void> {
    let command = connection.createCommand();
    command.arg("tag");
    command.arg(sourceImage);
    command.arg(targetImage);

    tl.debug(`Tagging image ${sourceImage} with ${targetImage}.`);
    return connection.execCommand(command);
}

export function run(connection: ContainerConnection): Q.Promise<void> {
    let imageToTag = tl.getInput("imageToTag");
    
    // get tags input
    let tags = tl.getDelimitedInput("tags", "\n");

    // get qualified image names from the containerRegistries input
    let repositoryName = tl.getInput("repository");
    let imageName = connection.getQualifiedImageName(repositoryName);

    let promise: Q.Promise<void>;
    // tag by combining the image name and the tags
    if (tags) {
        tags.forEach(tag => {
            if (promise) {
                promise = promise.then(() => dockerTag(connection, imageToTag, imageName + ":" + tag));
            }
            else {
                promise = dockerTag(connection, imageToTag, imageName + ":" + tag);
            }
        });
    }

    return promise;
}