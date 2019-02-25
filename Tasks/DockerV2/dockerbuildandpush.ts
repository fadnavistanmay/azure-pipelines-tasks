"use strict";

import * as path from "path";
import * as tl from "vsts-task-lib/task";
import ContainerConnection from "docker-common/containerconnection";
import * as utils from "./utils";
import * as imageUtils from "docker-common/containerimageutils";
import { ToolRunner } from "vsts-task-lib/toolrunner";

export function run(connection: ContainerConnection): any {
    let args = tl.getInput("arguments");
    if (args) {
        throw new Error(tl.loc('ArgumentsNotSupportedWithBuildAndPush'));
    }

    let dockerbuild = require("./dockerbuild");
    let dockerpush = require("./dockerpush");

    let promise = dockerbuild.run();
    promise = promise.then(() => {
        dockerpush.run();
    })
    return promise;
}