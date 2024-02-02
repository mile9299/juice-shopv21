"use strict";
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="cypress" />
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************
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
// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)
/**
 * @type {Cypress.PluginConfig}
 */
const config = __importStar(require("config"));
const otplib = __importStar(require("otplib"));
const utils = __importStar(require("../../../lib/utils"));
const security = __importStar(require("../../../lib/insecurity"));
exports.default = (on) => {
    on('task', {
        GenerateCoupon(discount) {
            return security.generateCoupon(discount);
        },
        GetBlueprint() {
            for (const product of config.get('products')) {
                if (product.fileForRetrieveBlueprintChallenge) {
                    const blueprint = product.fileForRetrieveBlueprintChallenge;
                    return blueprint;
                }
            }
        },
        GetChristmasProduct() {
            return config.get('products').filter((product) => product.useForChristmasSpecialChallenge)[0];
        },
        GetCouponIntent() {
            const trainingData = require(`../../../data/chatbot/${utils.extractFilename(config.get('application.chatBot.trainingData'))}`);
            const couponIntent = trainingData.data.filter((data) => data.intent === 'queries.couponCode')[0];
            return couponIntent;
        },
        GetFromMemories(property) {
            for (const memory of config.get('memories')) {
                if (memory[property]) {
                    return memory[property];
                }
            }
        },
        GetFromConfig(variable) {
            return config.get(variable);
        },
        GetOverwriteUrl() {
            return config.get('challenges.overwriteUrlForProductTamperingChallenge');
        },
        GetPastebinLeakProduct() {
            return config.get('products').filter((product) => product.keywordsForPastebinDataLeakChallenge)[0];
        },
        GetTamperingProductId() {
            const products = config.get('products');
            for (let i = 0; i < products.length; i++) {
                if (products[i].urlForProductTamperingChallenge) {
                    return i + 1;
                }
            }
        },
        GenerateAuthenticator(inputString) {
            return otplib.authenticator.generate(inputString);
        },
        toISO8601() {
            const date = new Date();
            return utils.toISO8601(date);
        },
        disableOnContainerEnv() {
            return utils.disableOnContainerEnv();
        },
        disableOnWindowsEnv() {
            return utils.disableOnWindowsEnv();
        }
    });
    // `on` is used to hook into various events Cypress emits
    // `config` is the resolved Cypress config
};
//# sourceMappingURL=index.js.map