"use strict";
/*
 * Copyright (c) 2014-2023 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.totalCheatScore = exports.calculateFixItCheatScore = exports.calculateFindItCheatScore = exports.calculateCheatScore = void 0;
const config_1 = __importDefault(require("config"));
const safe_1 = __importDefault(require("colors/safe"));
const vulnCodeSnippet_1 = require("../routes/vulnCodeSnippet");
const vulnCodeFixes_1 = require("../routes/vulnCodeFixes");
const codingChallenges_1 = require("./codingChallenges");
const logger_1 = __importDefault(require("./logger"));
const coupledChallenges = {
    loginAdminChallenge: ['weakPasswordChallenge'],
    nullByteChallenge: ['easterEggLevelOneChallenge', 'forgottenDevBackupChallenge', 'forgottenBackupChallenge', 'misplacedSignatureFileChallenge'],
    deprecatedInterfaceChallenge: ['uploadTypeChallenge', 'xxeFileDisclosureChallenge', 'xxeDosChallenge'],
    uploadSizeChallenge: ['uploadTypeChallenge', 'xxeFileDisclosureChallenge', 'xxeDosChallenge'],
    uploadTypeChallenge: ['uploadSizeChallenge', 'xxeFileDisclosureChallenge', 'xxeDosChallenge']
};
const trivialChallenges = ['errorHandlingChallenge', 'privacyPolicyChallenge'];
const solves = [{ challenge: {}, phase: 'server start', timestamp: new Date(), cheatScore: 0 }]; // seed with server start timestamp
const calculateCheatScore = (challenge) => {
    const timestamp = new Date();
    let cheatScore = 0;
    let timeFactor = 2;
    timeFactor *= (config_1.default.get('challenges.showHints') ? 1 : 1.5);
    timeFactor *= (challenge.tutorialOrder && config_1.default.get('hackingInstructor.isEnabled') ? 0.5 : 1);
    if (areCoupled(challenge, previous().challenge) || isTrivial(challenge)) {
        timeFactor = 0;
    }
    const minutesExpectedToSolve = challenge.difficulty * timeFactor;
    const minutesSincePreviousSolve = (timestamp.getTime() - previous().timestamp.getTime()) / 60000;
    cheatScore += Math.max(0, 1 - (minutesSincePreviousSolve / minutesExpectedToSolve));
    logger_1.default.info(`Cheat score for ${areCoupled(challenge, previous().challenge) ? 'coupled ' : (isTrivial(challenge) ? 'trivial ' : '')}${challenge.tutorialOrder ? 'tutorial ' : ''}${safe_1.default.cyan(challenge.key)} solved in ${Math.round(minutesSincePreviousSolve)}min (expected ~${minutesExpectedToSolve}min) with${config_1.default.get('challenges.showHints') ? '' : 'out'} hints allowed: ${cheatScore < 0.33 ? safe_1.default.green(cheatScore.toString()) : (cheatScore < 0.66 ? safe_1.default.yellow(cheatScore.toString()) : safe_1.default.red(cheatScore.toString()))}`);
    solves.push({ challenge, phase: 'hack it', timestamp, cheatScore });
    return cheatScore;
};
exports.calculateCheatScore = calculateCheatScore;
const calculateFindItCheatScore = async (challenge) => {
    const timestamp = new Date();
    let timeFactor = 0.001;
    timeFactor *= (challenge.key === 'scoreBoardChallenge' && config_1.default.get('hackingInstructor.isEnabled') ? 0.5 : 1);
    let cheatScore = 0;
    const codeSnippet = await (0, vulnCodeSnippet_1.retrieveCodeSnippet)(challenge.key);
    if (!codeSnippet) {
        return 0;
    }
    const { snippet, vulnLines } = codeSnippet;
    timeFactor *= vulnLines.length;
    const identicalSolved = await checkForIdenticalSolvedChallenge(challenge);
    if (identicalSolved) {
        timeFactor = 0.8 * timeFactor;
    }
    const minutesExpectedToSolve = Math.ceil(snippet.length * timeFactor);
    const minutesSincePreviousSolve = (timestamp.getTime() - previous().timestamp.getTime()) / 60000;
    cheatScore += Math.max(0, 1 - (minutesSincePreviousSolve / minutesExpectedToSolve));
    logger_1.default.info(`Cheat score for "Find it" phase of ${challenge.key === 'scoreBoardChallenge' && config_1.default.get('hackingInstructor.isEnabled') ? 'tutorial ' : ''}${safe_1.default.cyan(challenge.key)} solved in ${Math.round(minutesSincePreviousSolve)}min (expected ~${minutesExpectedToSolve}min): ${cheatScore < 0.33 ? safe_1.default.green(cheatScore.toString()) : (cheatScore < 0.66 ? safe_1.default.yellow(cheatScore.toString()) : safe_1.default.red(cheatScore.toString()))}`);
    solves.push({ challenge, phase: 'find it', timestamp, cheatScore });
    return cheatScore;
};
exports.calculateFindItCheatScore = calculateFindItCheatScore;
const calculateFixItCheatScore = async (challenge) => {
    const timestamp = new Date();
    let cheatScore = 0;
    const { fixes } = await (0, vulnCodeFixes_1.readFixes)(challenge.key);
    const minutesExpectedToSolve = Math.floor(fixes.length / 2);
    const minutesSincePreviousSolve = (timestamp.getTime() - previous().timestamp.getTime()) / 60000;
    cheatScore += Math.max(0, 1 - (minutesSincePreviousSolve / minutesExpectedToSolve));
    logger_1.default.info(`Cheat score for "Fix it" phase of ${safe_1.default.cyan(challenge.key)} solved in ${Math.round(minutesSincePreviousSolve)}min (expected ~${minutesExpectedToSolve}min): ${cheatScore < 0.33 ? safe_1.default.green(cheatScore.toString()) : (cheatScore < 0.66 ? safe_1.default.yellow(cheatScore.toString()) : safe_1.default.red(cheatScore.toString()))}`);
    solves.push({ challenge, phase: 'fix it', timestamp, cheatScore });
    return cheatScore;
};
exports.calculateFixItCheatScore = calculateFixItCheatScore;
const totalCheatScore = () => {
    return solves.length > 1 ? solves.map(({ cheatScore }) => cheatScore).reduce((sum, score) => { return sum + score; }) / (solves.length - 1) : 0;
};
exports.totalCheatScore = totalCheatScore;
function areCoupled(challenge, previousChallenge) {
    var _a, _b;
    // @ts-expect-error
    return ((_a = coupledChallenges[challenge.key]) === null || _a === void 0 ? void 0 : _a.indexOf(previousChallenge.key)) > -1 || ((_b = coupledChallenges[previousChallenge.key]) === null || _b === void 0 ? void 0 : _b.indexOf(challenge.key)) > -1;
}
function isTrivial(challenge) {
    return trivialChallenges.includes(challenge.key);
}
function previous() {
    return solves[solves.length - 1];
}
const checkForIdenticalSolvedChallenge = async (challenge) => {
    const codingChallenges = await (0, codingChallenges_1.getCodeChallenges)();
    if (!codingChallenges.has(challenge.key)) {
        return false;
    }
    const codingChallengesToCompareTo = codingChallenges.get(challenge.key);
    if (!codingChallengesToCompareTo || !codingChallengesToCompareTo.snippet) {
        return false;
    }
    const snippetToCompareTo = codingChallengesToCompareTo.snippet;
    for (const [challengeKey, { snippet }] of codingChallenges.entries()) {
        if (challengeKey === challenge.key) {
            // don't compare to itself
            continue;
        }
        if (snippet === snippetToCompareTo) {
            for (const solvedChallenges of solves) {
                if (solvedChallenges.phase === 'find it') {
                    return true;
                }
            }
        }
    }
    return false;
};
//# sourceMappingURL=antiCheat.js.map