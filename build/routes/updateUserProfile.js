"use strict";
/*
 * Copyright (c) 2014-2023 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const user_1 = require("../models/user");
const challengeUtils = require("../lib/challengeUtils");
const utils = __importStar(require("../lib/utils"));
const security = require('../lib/insecurity');
const cache = require('../data/datacache');
const challenges = cache.challenges;
module.exports = function updateUserProfile() {
    return (req, res, next) => {
        const loggedInUser = security.authenticatedUsers.get(req.cookies.token);
        if (loggedInUser) {
            user_1.UserModel.findByPk(loggedInUser.data.id).then((user) => {
                if (user) {
                    challengeUtils.solveIf(challenges.csrfChallenge, () => {
                        var _a, _b, _c;
                        return ((_b = ((_a = req.headers.origin) === null || _a === void 0 ? void 0 : _a.includes('://htmledit.squarefree.com'))) !== null && _b !== void 0 ? _b : ((_c = req.headers.referer) === null || _c === void 0 ? void 0 : _c.includes('://htmledit.squarefree.com'))) &&
                            req.body.username !== user.username;
                    });
                    void user.update({ username: req.body.username }).then((savedUser) => {
                        savedUser = utils.queryResultToJson(savedUser);
                        const updatedToken = security.authorize(savedUser);
                        security.authenticatedUsers.put(updatedToken, savedUser);
                        res.cookie('token', updatedToken);
                        res.location(process.env.BASE_PATH + '/profile');
                        res.redirect(process.env.BASE_PATH + '/profile');
                    });
                }
            }).catch((error) => {
                next(error);
            });
        }
        else {
            next(new Error('Blocked illegal activity by ' + req.socket.remoteAddress));
        }
    };
};
//# sourceMappingURL=updateUserProfile.js.map