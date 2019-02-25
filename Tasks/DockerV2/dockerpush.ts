"use strict";

import * as fs from "fs";
import * as tl from "vsts-task-lib/task";
import ContainerConnection from "docker-common/containerconnection";
import * as sourceUtils from "docker-common/sourceutils";
import * as imageUtils from "docker-common/containerimageutils";
import * as utils from "./utils";

function dockerPush(connection: ContainerConnection, image: string, imageDigestFile?: string, useMultiImageMode?: boolean, commandArguments?: string): any {
    var command = connection.createCommand();
    command.arg("push");
    command.arg(image);
    command.line(commandArguments);

    if (!imageDigestFile) {
        return connection.execCommand(command);
    }

    // ~~ image digest things below. See if we want this or not!
    var output = "";
    command.on("stdout", data => {
        output += data;
    });

    return connection.execCommand(command).then(() => {
        // Parse the output to find the repository digest
        var imageDigest = output.match(/^[^:]*: digest: ([^ ]*) size: \d*$/m)[1];
        if (imageDigest) {
            let baseImageName = imageUtils.imageNameWithoutTag(image);
            let formattedDigestValue = baseImageName + "@" + imageDigest;
            if (useMultiImageMode) {
                // If we're pushing multiple images, we need to append all the digest values. Each one is contained on its own line.
                fs.appendFileSync(imageDigestFile, formattedDigestValue + "\r\n");
            } else {
                fs.writeFileSync(imageDigestFile, formattedDigestValue);
            }
        }
    });
}

export function run(connection: ContainerConnection): any {
    // ~~ this should have a function as a parameter 'outputUpdate' to which it passes the path to the image digest file or maybe output each individual push into different files ?
    let command = tl.getInput("command", true);
    var commandArguments = tl.getInput("arguments", false); 

    // get tags input
    let tags = tl.getDelimitedInput("tags", "\n");

    // get qualified image name from the containerRegistry input
    let repositoryName = tl.getInput("repository");
    let imageName = connection.getQualifiedImageName(repositoryName);

    let promise: Q.Promise<void>;
    // add all tags to push
    if (tags) {
        tags.forEach(tag => {
            if (promise) {
                promise = promise.then(() => dockerPush(connection, imageName + ":" + tag, "", false, commandArguments));
            }
            else {
                promise = dockerPush(connection, imageName + ":" + tag, "", false, commandArguments);
            }
        });
    }

    // let imageDigestFile: string = null;
    // if (tl.filePathSupplied("imageDigestFile")) {
    //     imageDigestFile = tl.getPathInput("imageDigestFile");
    // }

    // ~~ see what we want to do with the image digest file
    // let firstImageMapping = imageMappings.shift();
    // let pushedSourceImages = [firstImageMapping.sourceImageName];
    // let promise = dockerPush(connection, firstImageMapping.targetImageName, imageDigestFile, false, commandArguments);
    // imageMappings.forEach(imageMapping => {
    //     // If we've already pushed a tagged version of this source image, then we don't want to write the digest info to the file since it will be duplicate.
    //     if (pushedSourceImages.indexOf(imageMapping.sourceImageName) >= 0) {
    //         promise = promise.then(() => dockerPush(connection, imageMapping.targetImageName, commandArguments = commandArguments));
    //     } else {
    //         pushedSourceImages.push(imageMapping.sourceImageName);
    //         promise = promise.then(() => dockerPush(connection, imageMapping.targetImageName, imageDigestFile, false, commandArguments));
    //     }
    // });

    return promise;
}
