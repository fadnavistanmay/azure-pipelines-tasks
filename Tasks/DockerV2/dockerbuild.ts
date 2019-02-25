"use strict";

import * as path from "path";
import * as tl from "vsts-task-lib/task";
import ContainerConnection from "docker-common/containerconnection";

function findDockerFile(dockerfilepath : string) : string {
    if (dockerfilepath.indexOf('*') >= 0 || dockerfilepath.indexOf('?') >= 0) {
        tl.debug(tl.loc('ContainerPatternFound'));
        let buildFolder = tl.getVariable('System.DefaultWorkingDirectory');
        let allFiles = tl.find(buildFolder);
        let matchingResultsFiles = tl.match(allFiles, dockerfilepath, buildFolder, { matchBase: true });

        if (!matchingResultsFiles || matchingResultsFiles.length == 0) {
            throw new Error(tl.loc('ContainerDockerFileNotFound', dockerfilepath));
        }

        return matchingResultsFiles[0];
    }
    else
    {
        tl.debug(tl.loc('ContainerPatternNotFound'));
        return dockerfilepath;
    }
}

export function run(connection: ContainerConnection): any { // ~~ what about the second parameter (outputUpdate) ?
    let command = connection.createCommand();
    command.arg("build");

    // add dockerfile path
    let dockerfilepath = tl.getInput("dockerFile", true);
    let dockerFile = findDockerFile(dockerfilepath);
    
    if(!tl.exist(dockerFile)) {
        throw new Error(tl.loc('ContainerDockerFileNotFound', dockerfilepath));
    }

    command.arg(["-f", dockerFile]);

    // add command arguments
    let commandArguments = tl.getInput("arguments", false); 
    command.line(commandArguments);
    
    // get qualified image name from the containerRegistry input
    let repositoryName = tl.getInput("repository");
    let imageName = connection.getQualifiedImageName(repositoryName);

    // get tags input
    let tags = tl.getDelimitedInput("tags", "\n");

    // add all the tags in the command
    if (tags) {
        tags.forEach(tag => {
            command.arg(["-t", imageName + ":" + tag]);
        });
    }

    // add build context
    let context: string;
    let buildContext = tl.getPathInput("buildContext");
    if (!buildContext) {
        context = path.dirname(dockerFile);
    } else {
        context = buildContext;
    }

    command.arg(context);
    return connection.execCommand(command);
}
